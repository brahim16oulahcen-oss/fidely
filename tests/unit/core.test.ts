import { beforeEach, describe, expect, it } from "vitest";
import { getRepos } from "@/lib/db";
import { replaceDatabase, resetDemoDatabase } from "@/lib/db/demo-store";
import { buildSeed } from "@/lib/demo/seed";
import type { MerchantActor } from "@/lib/auth/permissions";
import { registerOwner, verifyEmail } from "@/features/auth/service";
import { createMerchantFromOnboarding, inviteMember } from "@/features/merchants/service";
import { createProgram, updateProgram } from "@/features/loyalty/programs";
import { enrollCustomer, getCardByToken } from "@/features/customers/service";
import { earn, redeemIssuance, redeemPointsReward, resolveScan, type OpContext } from "@/features/loyalty/operations";
import { changePlan } from "@/features/subscriptions/service";
import { computeKpis, rangeFromPreset } from "@/features/analytics/metrics";
import { loadDataset } from "@/features/analytics/loader";
import { computeEarn } from "@/features/loyalty/engine";
import { createCampaign } from "@/features/campaigns/service";
import type { Merchant } from "@/types/domain";

const repos = getRepos();
let clock = Date.now();
const tick = () => new Date((clock += 5 * 60_000));
let keySeq = 0;
const key = () => `test-key-${++keySeq}-${Math.random().toString(36).slice(2)}`;

async function ctxFor(merchantId: string, email?: string): Promise<OpContext> {
  const merchant = (await repos.merchants.findById(merchantId))!;
  const users = await repos.users.findMany();
  const user = email ? users.find((u) => u.email === email)! : users.find((u) => u.memberships.some((m) => m.merchantId === merchantId && m.role === "owner"))!;
  const m = user.memberships.find((x) => x.merchantId === merchantId)!;
  const actor: MerchantActor = { userId: user.id, name: user.name, email: user.email, isPlatformAdmin: false, merchantId, role: m.role };
  return { repos, actor, merchant, now: tick() };
}

const ONBOARDING = {
  business: { name: "Café Test Démo", category: "cafe" as const, address: "1 rue de test", postalCode: "76000", city: "Rouen", phone: "", description: "" },
  branding: { icon: "Coffee", primary: "#1F2937", text: "#FFFFFF", accent: "#F59E0B" },
  program: { name: "Carte Café", rules: { type: "stamps" as const, stampsRequired: 10, stampsPerVisit: 1, rewardName: "1 café offert", rewardValidityDays: 60 } },
  rewards: [],
  card: { title: "Carte Café", background: "#1F2937", text: "#FFFFFF", accent: "#F59E0B", showLogo: true, rewardText: "1 café offert", terms: "Conditions" },
};

async function newMerchantFlow(): Promise<Merchant> {
  const user = await registerOwner(repos, { name: "Alex Test", email: `alex${Math.random().toString(36).slice(2)}@example.com`, password: "motdepasse1", acceptTerms: true });
  await verifyEmail(repos, user.id, user.verificationCode!);
  const verified = (await repos.users.findById(user.id))!;
  return createMerchantFromOnboarding(repos, verified, ONBOARDING);
}

const CUSTOMER = { firstName: "Jeanne", lastName: "Testeuse", email: "", phone: "", birthday: "", acceptTerms: true as const, consentEmail: true, consentSms: false };

beforeEach(() => {
  replaceDatabase(buildSeed());
  clock = Date.now() + 3600_000;
});

describe("Parcours principal", () => {
  it("1. crée un commerce via l'onboarding (programme, récompense, essai)", async () => {
    const m = await newMerchantFlow();
    expect(m.status).toBe("trial");
    expect(await repos.programs.count({ merchantId: m.id })).toBe(1);
    const rewards = await repos.rewards.findMany({ merchantId: m.id });
    expect(rewards[0].cost).toBe(10);
    expect(rewards[0].autoUnlock).toBe(true);
    expect((await repos.subscriptions.findById(m.id))?.status).toBe("trialing");
    expect(await repos.stores.count({ merchantId: m.id })).toBe(1);
  });

  it("refuse la création d'un commerce sans email vérifié", async () => {
    const user = await registerOwner(repos, { name: "Non Vérifié", email: "nv@example.com", password: "motdepasse1", acceptTerms: true });
    await expect(createMerchantFromOnboarding(repos, user, ONBOARDING)).rejects.toThrow(/Vérifiez/);
  });

  it("2. crée un programme à points (offre Pro)", async () => {
    const m = await newMerchantFlow();
    const ctx = await ctxFor(m.id);
    const p = await createProgram(ctx, { name: "Points", rules: { type: "points", pointsPerEuro: 2, welcomePoints: 0 } });
    expect(p.type).toBe("points");
    expect(p.status).toBe("inactive"); // le premier programme reste actif
  });

  it("3-4. inscrit un client et génère une carte web sans donnée personnelle dans le QR", async () => {
    const m = await newMerchantFlow();
    const { card, customer } = await enrollCustomer(repos, m, { ...CUSTOMER, email: "jeanne@example.com" }, "qr");
    expect(card.token.length).toBeGreaterThanOrEqual(30);
    expect(card.scanCode).toMatch(/^FDL-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(card.scanCode.toLowerCase()).not.toContain("jeanne");
    const web = await getCardByToken(repos, card.token);
    expect(web?.customer.id).toBe(customer.id);
    expect(await getCardByToken(repos, "jeton-invalide-mais-assez-long-xxxx")).toBeNull();
    const logs = await repos.consentLogs.findMany({ customerId: customer.id });
    expect(logs.find((l) => l.channel === "email")?.granted).toBe(true);
    expect(logs.find((l) => l.channel === "sms")?.granted).toBe(false);
  });

  it("refuse une double inscription avec le même email", async () => {
    const m = await newMerchantFlow();
    await enrollCustomer(repos, m, { ...CUSTOMER, email: "dup@example.com" }, "qr");
    await expect(enrollCustomer(repos, m, { ...CUSTOMER, email: "dup@example.com" }, "qr")).rejects.toThrow(/existe déjà/);
  });

  it("5-9. tampons → déblocage → utilisation → double utilisation bloquée", async () => {
    const m = await newMerchantFlow();
    const { card } = await enrollCustomer(repos, m, { ...CUSTOMER, email: "j2@example.com" }, "qr");
    let last;
    for (let i = 0; i < 9; i++) {
      last = await earn(await ctxFor(m.id), { cardId: card.id, amountCents: null, idempotencyKey: key() });
    }
    expect(last!.snapshot.card.stamps).toBe(9);
    expect(last!.snapshot.issuances).toHaveLength(0);
    const tenth = await earn(await ctxFor(m.id), { cardId: card.id, amountCents: 450, idempotencyKey: key() });
    expect(tenth.unlocked).toHaveLength(1);
    expect(tenth.snapshot.card.stamps).toBe(0);
    const iss = tenth.snapshot.issuances[0];
    expect(iss.status).toBe("available");

    const k = key();
    const used = await redeemIssuance(await ctxFor(m.id), { issuanceId: iss.id, idempotencyKey: k });
    expect(used.snapshot.issuances[0].status).toBe("redeemed");
    // Même clé (double clic / renvoi réseau) : ignoré, pas de seconde transaction
    const replay = await redeemIssuance(await ctxFor(m.id), { issuanceId: iss.id, idempotencyKey: k });
    expect(replay.duplicate).toBe(true);
    // Nouvelle tentative (autre appareil) : refusée
    await expect(redeemIssuance(await ctxFor(m.id), { issuanceId: iss.id, idempotencyKey: key() })).rejects.toThrow(/déjà été utilisée/);
    expect((await repos.transactions.findMany({ issuanceId: iss.id, kind: "redeem" })).length).toBe(1);
  });

  it("double soumission simultanée : une seule transaction", async () => {
    const m = await newMerchantFlow();
    const { card } = await enrollCustomer(repos, m, { ...CUSTOMER, email: "j3@example.com" }, "qr");
    const ctx = await ctxFor(m.id);
    const k = key();
    const [a, b] = await Promise.all([
      earn(ctx, { cardId: card.id, amountCents: null, idempotencyKey: k }),
      earn(ctx, { cardId: card.id, amountCents: null, idempotencyKey: k }),
    ]);
    expect([a.duplicate, b.duplicate].sort()).toEqual([false, true]);
    expect((await repos.cards.findById(card.id))!.stamps).toBe(1);
  });

  it("anti-fraude : passage trop rapproché refusé", async () => {
    const m = await newMerchantFlow();
    const { card } = await enrollCustomer(repos, m, { ...CUSTOMER, email: "j4@example.com" }, "qr");
    const ctx = await ctxFor(m.id);
    await earn(ctx, { cardId: card.id, amountCents: null, idempotencyKey: key() });
    await expect(earn({ ...ctx, now: new Date(ctx.now!.getTime() + 5000) }, { cardId: card.id, amountCents: null, idempotencyKey: key() })).rejects.toThrow(/déjà été enregistré/);
  });

  it("6. attribue des points selon le montant (Barber Studio)", async () => {
    const ctx = await ctxFor("mer_barber");
    const card = (await repos.cards.findMany({ merchantId: "mer_barber" }))[0];
    const before = card.points;
    const r = await earn(ctx, { cardId: card.id, amountCents: 2650, idempotencyKey: key() });
    expect(r.snapshot.card.points).toBe(before + 26);
    await expect(earn(await ctxFor("mer_barber"), { cardId: card.id, amountCents: null, idempotencyKey: key() })).rejects.toThrow(/montant/i);
  });

  it("échange de points : solde insuffisant refusé", async () => {
    const ctx = await ctxFor("mer_barber");
    const card = (await repos.cards.findMany({ merchantId: "mer_barber" })).find((c) => c.points < 80)!;
    await expect(redeemPointsReward(ctx, { cardId: card.id, rewardId: "rwd_barber_1", idempotencyKey: key() })).rejects.toThrow(/insuffisant/);
  });

  it("10. les statistiques reflètent les nouvelles opérations", async () => {
    const m = await newMerchantFlow();
    const range = rangeFromPreset("7");
    range.to = new Date(clock + 3600_000);
    const before = computeKpis(await loadDataset(repos, m.id), range);
    const { card } = await enrollCustomer(repos, m, { ...CUSTOMER, email: "j5@example.com" }, "qr");
    await earn(await ctxFor(m.id), { cardId: card.id, amountCents: 500, idempotencyKey: key() });
    const after = computeKpis(await loadDataset(repos, m.id), range);
    expect(after.newCustomers).toBe(before.newCustomers + 1);
    expect(after.visits).toBe(before.visits + 1);
    expect(after.revenueRecorded).toBe(before.revenueRecorded + 500);
  });

  it("11. isolation : un commerce ne peut ni lire ni créditer la carte d'un autre", async () => {
    const otherCard = (await repos.cards.findMany({ merchantId: "mer_barber" }))[0];
    const cafe = await ctxFor("mer_cafe");
    await expect(earn(cafe, { cardId: otherCard.id, amountCents: 1000, idempotencyKey: key() })).rejects.toThrow(/introuvable/);
    await expect(resolveScan(cafe, otherCard.scanCode)).rejects.toThrow(/n'appartient pas/);
    const ds = await loadDataset(repos, "mer_cafe");
    expect(ds.customers.every((c) => c.merchantId === "mer_cafe")).toBe(true);
    expect(ds.transactions.every((t) => t.merchantId === "mer_cafe")).toBe(true);
  });

  it("12. rôles : l'employé scanne mais ne gère ni l'offre, ni les programmes, ni l'équipe", async () => {
    const staff = await ctxFor("mer_cafe", "lucas@demo.fidely.example");
    expect(staff.actor.role).toBe("staff");
    const card = (await repos.cards.findMany({ merchantId: "mer_cafe" }))[5];
    await expect(earn(staff, { cardId: card.id, amountCents: null, idempotencyKey: key() })).resolves.toBeTruthy();
    await expect(changePlan(staff, "business")).rejects.toThrow(/droits/);
    await expect(createProgram(staff, { name: "X", rules: { type: "points", pointsPerEuro: 1, welcomePoints: 0 } })).rejects.toThrow(/droits/);
    await expect(inviteMember(staff, { name: "Y", email: "y@example.com", role: "staff" })).rejects.toThrow(/droits/);
    await expect(createCampaign(staff, { name: "Spam", channel: "email", segment: "all", subject: "x", message: "Bonjour à tous", mode: "send" })).rejects.toThrow(/droits/);
  });

  it("13. changement d'abonnement et limites", async () => {
    const ctx = await ctxFor("mer_cafe");
    await changePlan(ctx, "business");
    expect((await repos.merchants.findById("mer_cafe"))!.planId).toBe("business");
    const invoices = await repos.invoices.findMany({ merchantId: "mer_cafe" });
    expect(invoices.some((i) => i.planId === "business" && i.number.startsWith("DEMO-"))).toBe(true);
    // Barber (points, 130 clients) ne peut pas passer en Starter (tampons uniquement)
    await expect(changePlan(await ctxFor("mer_barber"), "starter")).rejects.toThrow(/non inclus/);
  });

  it("modification des règles non rétroactive", async () => {
    const ctx = await ctxFor("mer_cafe");
    const oldTx = (await repos.transactions.findMany({ merchantId: "mer_cafe", kind: "earn" }))[0];
    const snapshot = JSON.stringify(oldTx);
    const p = await updateProgram(ctx, "prg_cafe", { name: "Carte Café", rules: { type: "stamps", stampsRequired: 8, stampsPerVisit: 1, rewardName: "1 café offert", rewardValidityDays: 60 } });
    expect(p.ruleVersion).toBe(3);
    expect(JSON.stringify(await repos.transactions.findById(oldTx.id))).toBe(snapshot);
    expect((await repos.rewards.findById("rwd_cafe_1"))!.cost).toBe(8);
  });

  it("campagne : seuls les clients consentants reçoivent le message simulé", async () => {
    const ctx = await ctxFor("mer_cafe");
    const c = await createCampaign(ctx, { name: "Test", channel: "sms", segment: "all", message: "Bonjour {prenom}", mode: "send" });
    const logs = await repos.messageLogs.findMany({ campaignId: c.id });
    const customers = new Map((await repos.customers.findMany({ merchantId: "mer_cafe" })).map((x) => [x.id, x]));
    for (const l of logs) expect(l.status === "simulated").toBe(customers.get(l.customerId)!.consent.sms);
    expect(c.stats.excludedNoConsent).toBeGreaterThan(0);
  });

  it("14. réinitialisation de la démo", async () => {
    await repos.merchants.update("mer_cafe", { name: "Modifié" });
    resetDemoDatabase();
    expect((await repos.merchants.findById("mer_cafe"))!.name).toBe("Café Rouen Centre");
    expect((await repos.customers.findMany()).length).toBeGreaterThan(500);
  });
});

describe("Moteur de fidélité", () => {
  const card = { stamps: 0, points: 0, lifetimePoints: 0, cashbackCents: 0, tier: "bronze" as const };
  it("cashback : 5 % au-delà du minimum, plafonné", () => {
    const rules = { type: "cashback" as const, percent: 5, minPurchaseCents: 1500, maxCreditPerTxCents: 1000 };
    expect(computeEarn({ rules, status: "active" }, card, { amountCents: 4000 }).cashbackDeltaCents).toBe(200);
    expect(computeEarn({ rules, status: "active" }, card, { amountCents: 1000 }).cashbackDeltaCents).toBe(0);
    expect(computeEarn({ rules, status: "active" }, card, { amountCents: 50000 }).cashbackDeltaCents).toBe(1000);
  });
  it("niveaux VIP : multiplicateur et passage de niveau", () => {
    const rules = { type: "tiers" as const, pointsPerEuro: 1, silverThreshold: 300, goldThreshold: 800, multipliers: { bronze: 1, silver: 1.25, gold: 1.5 }, benefits: { bronze: "", silver: "", gold: "" } };
    const r = computeEarn({ rules, status: "active" }, { ...card, lifetimePoints: 280 }, { amountCents: 3000 });
    expect(r.pointsDelta).toBe(30);
    expect(r.tierAfter).toBe("silver");
    expect(r.tierChanged).toBe(true);
    const s = computeEarn({ rules, status: "active" }, { ...card, tier: "silver", lifetimePoints: 400 }, { amountCents: 4000 });
    expect(s.pointsDelta).toBe(50);
  });
  it("programme désactivé : aucune attribution", () => {
    const rules = { type: "stamps" as const, stampsRequired: 10, stampsPerVisit: 1, rewardName: "x", rewardValidityDays: 30 };
    expect(() => computeEarn({ rules, status: "inactive" }, card, { amountCents: null })).toThrow(/désactivé/);
  });
});
