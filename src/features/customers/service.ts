import "server-only";
import type { Repositories } from "@/lib/db/repository";
import { AppError, assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { newId, newScanCode, newSecretToken } from "@/lib/utils/ids";
import { getPlan } from "@/config/plans";
import type { Customer, LoyaltyCard, Merchant } from "@/types/domain";
import type { MerchantCtx } from "@/features/loyalty/programs";
import { snapshotCard } from "@/features/loyalty/operations";
import { enrollSchema, consentSchema, type CustomerFilter, type EnrollInput } from "./schemas";
import { primaryStatus, segmentOf, type CustomerStatus } from "./segments";
import { triggerAutomation } from "@/features/campaigns/service";

export const PAGE_SIZE = 20;

async function customerLimitReached(repos: Repositories, merchant: Merchant) {
  const plan = getPlan(merchant.planId);
  const count = (await repos.customers.findMany({ merchantId: merchant.id })).filter((c) => !c.deletedAt).length;
  return { reached: count >= plan.limits.customers, count, limit: plan.limits.customers };
}

/**
 * Adhésion d'un client (sans mot de passe). Le consentement marketing est
 * distinct de l'adhésion au programme et facultatif.
 */
export async function enrollCustomer(
  repos: Repositories,
  merchant: Merchant,
  raw: EnrollInput,
  source: Customer["source"],
  actorUserId: string | null = null,
) {
  const input = enrollSchema.parse(raw);
  if (merchant.status === "suspended" || merchant.status === "cancelled")
    throw new AppError("SUSPENDED", "Ce programme de fidélité n'accepte pas de nouvelles inscriptions pour le moment.");
  if (!merchant.primaryProgramId) throw new AppError("NOT_FOUND", "Ce commerce n'a pas encore de programme actif.");
  const program = await repos.programs.findById(merchant.primaryProgramId);
  if (!program || program.status !== "active") throw new AppError("NOT_FOUND", "Ce commerce n'a pas encore de programme actif.");
  const limit = await customerLimitReached(repos, merchant);
  if (limit.reached)
    throw new AppError("LIMIT", "Le programme a atteint sa capacité maximale. Le commerçant a été informé.");
  const existing = await repos.customers.findOne({ merchantId: merchant.id, email: input.email });
  if (existing && !existing.deletedAt)
    throw new AppError("CONFLICT", "Une carte existe déjà avec cette adresse email. Utilisez « Retrouver ma carte ».");

  return repos.tx(async () => {
    const now = new Date().toISOString();
    const customer: Customer = {
      id: newId("cus"),
      merchantId: merchant.id,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      birthday: input.birthday || undefined,
      consent: { email: input.consentEmail, sms: input.consentSms, wallet: false, updatedAt: now },
      createdAt: now,
      source,
    };
    await repos.customers.insert(customer);
    const card: LoyaltyCard = {
      id: newId("crd"),
      merchantId: merchant.id,
      programId: program.id,
      customerId: customer.id,
      token: newSecretToken(),
      scanCode: newScanCode(),
      stamps: 0,
      points: 0,
      lifetimePoints: 0,
      cashbackCents: 0,
      tier: "bronze",
      visits: 0,
      totalSpentCents: 0,
      lastVisitAt: null,
      createdAt: now,
      status: "active",
    };
    if (program.rules.type === "points" && program.rules.welcomePoints > 0) {
      card.points = program.rules.welcomePoints;
      card.lifetimePoints = program.rules.welcomePoints;
    }
    await repos.cards.insert(card);
    if (card.points > 0) {
      const store = (await repos.stores.findMany({ merchantId: merchant.id }))[0];
      await repos.transactions.insert({
        id: newId("trx"),
        merchantId: merchant.id,
        storeId: store?.id ?? "",
        programId: program.id,
        cardId: card.id,
        customerId: customer.id,
        kind: "welcome",
        amountCents: null,
        stampsDelta: 0,
        pointsDelta: card.points,
        cashbackDeltaCents: 0,
        ruleVersion: program.ruleVersion,
        ruleSummary: "Bonus de bienvenue",
        actorUserId: null,
        idempotencyKey: `welcome:${card.id}`,
        createdAt: now,
      });
    }
    for (const [channel, granted] of [["program", true], ["email", input.consentEmail], ["sms", input.consentSms]] as const) {
      await repos.consentLogs.insert({
        id: newId("cns"),
        merchantId: merchant.id,
        customerId: customer.id,
        channel,
        granted,
        source: source === "staff" ? "Saisie en caisse" : "Formulaire d'inscription",
        createdAt: now,
      });
    }
    await audit(repos, {
      actorUserId,
      actorLabel: actorUserId ? "Équipe" : "Client (inscription)",
      merchantId: merchant.id,
      action: "customer.enrolled",
      target: `${customer.firstName} ${customer.lastName.charAt(0)}.`,
      metadata: { source },
    });
    await triggerAutomation(repos, merchant, "new_member", [customer]);
    return { customer, card };
  });
}

export async function staffEnrollCustomer(ctx: MerchantCtx, raw: EnrollInput) {
  assertCan(ctx.actor, "customers.write");
  return enrollCustomer(ctx.repos, ctx.merchant, raw, "staff", ctx.actor.userId);
}

// ── CRM ────────────────────────────────────────────────────────

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  lastVisitAt: string | null;
  visits: number;
  points: number;
  stamps: number;
  cashbackCents: number;
  balanceLabel: string;
  rewardsAvailable: number;
  rewardsUsed: number;
  status: CustomerStatus;
  consentEmail: boolean;
  consentSms: boolean;
  totalSpentCents: number;
  tier: string;
}

export async function listCustomerRows(ctx: MerchantCtx): Promise<CustomerRow[]> {
  assertCan(ctx.actor, "customers.read");
  const [customers, cards, issuances, programs] = await Promise.all([
    ctx.repos.customers.findMany({ merchantId: ctx.merchant.id }),
    ctx.repos.cards.findMany({ merchantId: ctx.merchant.id }),
    ctx.repos.issuances.findMany({ merchantId: ctx.merchant.id }),
    ctx.repos.programs.findMany({ merchantId: ctx.merchant.id }),
  ]);
  const cardBy = new Map(cards.map((c) => [c.customerId, c]));
  const programBy = new Map(programs.map((p) => [p.id, p]));
  const now = new Date();
  const issBy = new Map<string, { a: number; u: number }>();
  for (const i of issuances) {
    const e = issBy.get(i.customerId) ?? { a: 0, u: 0 };
    if (i.status === "available" && new Date(i.expiresAt) > now) e.a++;
    if (i.status === "redeemed") e.u++;
    issBy.set(i.customerId, e);
  }
  return customers
    .filter((c) => !c.deletedAt)
    .map((c) => {
      const card = cardBy.get(c.id);
      const program = card ? programBy.get(card.programId) : undefined;
      const segs = card ? segmentOf(c, card, now) : (["all"] as const);
      const iss = issBy.get(c.id) ?? { a: 0, u: 0 };
      let balanceLabel = "—";
      if (card && program) {
        if (program.type === "stamps") balanceLabel = `${card.stamps} / ${program.rules.type === "stamps" ? program.rules.stampsRequired : 0} tampons`;
        else if (program.type === "cashback") balanceLabel = `${(card.cashbackCents / 100).toFixed(2).replace(".", ",")} €`;
        else balanceLabel = `${card.points} pts`;
      }
      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email,
        phone: c.phone,
        createdAt: c.createdAt,
        lastVisitAt: card?.lastVisitAt ?? null,
        visits: card?.visits ?? 0,
        points: card?.points ?? 0,
        stamps: card?.stamps ?? 0,
        cashbackCents: card?.cashbackCents ?? 0,
        balanceLabel,
        rewardsAvailable: iss.a,
        rewardsUsed: iss.u,
        status: primaryStatus([...segs]),
        consentEmail: c.consent.email,
        consentSms: c.consent.sms,
        totalSpentCents: card?.totalSpentCents ?? 0,
        tier: card?.tier ?? "bronze",
      };
    });
}

const STATUS_FOR_SEGMENT: Record<string, CustomerStatus[]> = {
  new: ["new"],
  active: ["active", "new", "loyal", "vip"],
  loyal: ["loyal", "vip"],
  vip: ["vip"],
  inactive: ["inactive"],
};

export function filterRows(rows: CustomerRow[], f: CustomerFilter) {
  let out = rows;
  if (f.q) {
    const q = f.q.toLowerCase();
    out = out.filter((r) => `${r.name} ${r.email} ${r.phone}`.toLowerCase().includes(q));
  }
  if (f.segment !== "all") out = out.filter((r) => STATUS_FOR_SEGMENT[f.segment].includes(r.status));
  if (f.consent === "email") out = out.filter((r) => r.consentEmail);
  if (f.consent === "sms") out = out.filter((r) => r.consentSms);
  if (f.consent === "none") out = out.filter((r) => !r.consentEmail && !r.consentSms);
  const dir = f.dir === "asc" ? 1 : -1;
  const key = f.sort;
  out = [...out].sort((a, b) => {
    const va = key === "name" ? a.name : key === "points" ? a.points + a.stamps + a.cashbackCents : (a[key] ?? "");
    const vb = key === "name" ? b.name : key === "points" ? b.points + b.stamps + b.cashbackCents : (b[key] ?? "");
    return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
  });
  return out;
}

export function rowsToCsv(rows: CustomerRow[]) {
  const header = ["Nom", "Email", "Téléphone", "Inscription", "Dernière visite", "Visites", "Solde", "Récompenses disponibles", "Récompenses utilisées", "Statut", "Consentement email", "Consentement SMS"];
  // Neutralise les injections de formules tableur (CSV injection).
  const esc = (v: string | number) => {
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = rows.map((r) =>
    [r.name, r.email, r.phone, r.createdAt.slice(0, 10), r.lastVisitAt?.slice(0, 10) ?? "", r.visits, r.balanceLabel, r.rewardsAvailable, r.rewardsUsed, r.status, r.consentEmail ? "oui" : "non", r.consentSms ? "oui" : "non"]
      .map(esc)
      .join(";"),
  );
  return "﻿" + [header.map(esc).join(";"), ...lines].join("\n");
}

export async function getCustomerDetail(ctx: MerchantCtx, customerId: string) {
  assertCan(ctx.actor, "customers.read");
  const customer = await ctx.repos.customers.findById(customerId);
  if (!customer || customer.merchantId !== ctx.merchant.id || customer.deletedAt) throw new AppError("NOT_FOUND", "Client introuvable.");
  const cards = await ctx.repos.cards.findMany({ customerId });
  const card = cards[0];
  const snapshot = card ? await snapshotCard(ctx.repos, card) : null;
  const [transactions, consentLogs, messages, users, stores] = await Promise.all([
    ctx.repos.transactions.findMany({ customerId }),
    ctx.repos.consentLogs.findMany({ customerId }),
    ctx.repos.messageLogs.findMany({ customerId }),
    ctx.repos.users.findMany(),
    ctx.repos.stores.findMany({ merchantId: ctx.merchant.id }),
  ]);
  const campaigns = await ctx.repos.campaigns.findMany({ merchantId: ctx.merchant.id });
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const storeName = new Map(stores.map((s) => [s.id, s.name]));
  const campaignName = new Map(campaigns.map((c) => [c.id, c.name]));
  return {
    customer,
    snapshot,
    segments: card ? segmentOf(customer, card) : [],
    transactions: transactions
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((t) => ({ ...t, actorName: t.actorUserId ? userName.get(t.actorUserId) ?? "—" : "Système", storeName: storeName.get(t.storeId) ?? "" })),
    consentLogs: consentLogs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    messages: messages.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((m) => ({ ...m, campaignName: campaignName.get(m.campaignId) ?? "Campagne" })),
  };
}

export async function updateConsentByMerchant(ctx: MerchantCtx, customerId: string, raw: unknown) {
  assertCan(ctx.actor, "customers.write");
  const consent = consentSchema.parse(raw);
  const customer = await ctx.repos.customers.findById(customerId);
  if (!customer || customer.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Client introuvable.");
  // Le commerçant ne peut que retirer un consentement (opposition reçue), jamais l'accorder à la place du client.
  for (const ch of ["email", "sms", "wallet"] as const) {
    if (consent[ch] && !customer.consent[ch])
      throw new AppError("FORBIDDEN", "Un consentement marketing ne peut être donné que par le client lui-même.");
  }
  await applyConsent(ctx.repos, customer, consent, `Retrait enregistré par ${ctx.actor.name}`);
}

export async function applyConsent(repos: Repositories, customer: Customer, consent: { email: boolean; sms: boolean; wallet: boolean }, source: string) {
  await repos.tx(async () => {
    const now = new Date().toISOString();
    for (const ch of ["email", "sms", "wallet"] as const) {
      if (consent[ch] !== customer.consent[ch]) {
        await repos.consentLogs.insert({ id: newId("cns"), merchantId: customer.merchantId, customerId: customer.id, channel: ch, granted: consent[ch], source, createdAt: now });
      }
    }
    await repos.customers.update(customer.id, { consent: { ...consent, updatedAt: now } });
  });
}

// ── Espace client (accès par jeton secret) ─────────────────────

export async function getCardByToken(repos: Repositories, token: string) {
  if (!token || token.length < 20) return null;
  const card = await repos.cards.findOne({ token });
  if (!card || card.status !== "active") return null;
  const [snapshot, merchant, customer] = await Promise.all([
    snapshotCard(repos, card),
    repos.merchants.findById(card.merchantId),
    repos.customers.findById(card.customerId),
  ]);
  if (!merchant || !customer || customer.deletedAt) return null;
  return { snapshot, merchant, customer };
}

export async function updatePreferencesByToken(repos: Repositories, token: string, raw: unknown) {
  const consent = consentSchema.parse(raw);
  const data = await getCardByToken(repos, token);
  if (!data) throw new AppError("NOT_FOUND", "Carte introuvable.");
  await applyConsent(repos, data.customer, consent, "Espace client");
}

export async function exportMyData(repos: Repositories, token: string) {
  const data = await getCardByToken(repos, token);
  if (!data) throw new AppError("NOT_FOUND", "Carte introuvable.");
  const { customer, merchant, snapshot } = data;
  const [transactions, consentLogs, messages] = await Promise.all([
    repos.transactions.findMany({ customerId: customer.id }),
    repos.consentLogs.findMany({ customerId: customer.id }),
    repos.messageLogs.findMany({ customerId: customer.id }),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    controller: { name: merchant.name, address: `${merchant.address}, ${merchant.postalCode} ${merchant.city}`, email: merchant.email },
    processor: "Fidely (sous-traitant)",
    customer: { firstName: customer.firstName, lastName: customer.lastName, email: customer.email, phone: customer.phone, birthday: customer.birthday ?? null, createdAt: customer.createdAt, consent: customer.consent },
    card: { program: snapshot.program.name, scanCode: snapshot.card.scanCode, stamps: snapshot.card.stamps, points: snapshot.card.points, cashbackCents: snapshot.card.cashbackCents, tier: snapshot.card.tier, visits: snapshot.card.visits, createdAt: snapshot.card.createdAt },
    rewards: snapshot.issuances.map((i) => ({ reward: i.rewardName, status: i.status, unlockedAt: i.unlockedAt, redeemedAt: i.redeemedAt ?? null })),
    transactions: transactions.map((t) => ({ date: t.createdAt, type: t.kind, amountCents: t.amountCents, stamps: t.stampsDelta, points: t.pointsDelta, cashbackCents: t.cashbackDeltaCents, rule: t.ruleSummary })),
    consentHistory: consentLogs.map((c) => ({ date: c.createdAt, channel: c.channel, granted: c.granted, source: c.source })),
    messages: messages.map((m) => ({ date: m.createdAt, channel: m.channel, status: m.status })),
  };
}

/**
 * Suppression du compte : anonymisation irréversible des données personnelles.
 * Les transactions sont conservées sans lien identifiant pour les statistiques du commerce.
 */
export async function deleteMyAccount(repos: Repositories, token: string) {
  const data = await getCardByToken(repos, token);
  if (!data) throw new AppError("NOT_FOUND", "Carte introuvable.");
  const { customer, snapshot } = data;
  await repos.tx(async () => {
    const now = new Date().toISOString();
    await repos.customers.update(customer.id, {
      firstName: "Client",
      lastName: "supprimé",
      email: `supprime+${customer.id}@invalid.example`,
      phone: "",
      birthday: undefined,
      consent: { email: false, sms: false, wallet: false, updatedAt: now },
      deletedAt: now,
    });
    await repos.cards.update(snapshot.card.id, { status: "revoked", token: newSecretToken(), scanCode: newScanCode() });
    await repos.consentLogs.insert({ id: newId("cns"), merchantId: customer.merchantId, customerId: customer.id, channel: "program", granted: false, source: "Suppression du compte par le client", createdAt: now });
    await audit(repos, { actorUserId: null, actorLabel: "Client", merchantId: customer.merchantId, action: "customer.deleted", target: customer.id });
  });
}

/** Récupération de carte : renvoie les liens à envoyer par email (envoi simulé en démo). */
export async function findCardsForRecovery(repos: Repositories, email: string) {
  const normalized = email.trim().toLowerCase();
  const customers = (await repos.customers.findMany({ email: normalized })).filter((c) => !c.deletedAt);
  const out: { merchantName: string; token: string }[] = [];
  for (const c of customers) {
    const card = await repos.cards.findOne({ customerId: c.id, status: "active" });
    const merchant = await repos.merchants.findById(c.merchantId);
    if (card && merchant) out.push({ merchantName: merchant.name, token: card.token });
  }
  return out;
}
