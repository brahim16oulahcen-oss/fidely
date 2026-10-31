import "server-only";
/**
 * Opérations de caisse (scanner) : attribution, utilisation de récompenses,
 * cashback. Toutes les opérations sont :
 *  - limitées au commerce de l'acteur (isolation multi-tenant),
 *  - soumises aux permissions du rôle,
 *  - sérialisées par carte (verrou) et idempotentes (clé unique),
 *  - tracées (transaction avec actorUserId + journal d'audit pour les actions sensibles).
 */
import type { Repositories } from "@/lib/db/repository";
import { AppError, assertCan, type MerchantActor } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/utils/ids";
import { DAY_MS } from "@/lib/utils/dates";
import type { LoyaltyCard, Merchant, Program, Reward, RewardIssuance, Transaction } from "@/types/domain";
import { checkCashbackUse, checkPointsRedemption, computeEarn, describeRules, LoyaltyError } from "./engine";

export interface OpContext {
  repos: Repositories;
  actor: MerchantActor;
  merchant: Merchant;
  now?: Date;
}

export interface CardSnapshot {
  card: LoyaltyCard;
  program: Program;
  customer: { id: string; firstName: string; lastName: string; email: string; createdAt: string };
  rewards: Reward[];
  issuances: (RewardIssuance & { rewardName: string })[];
  recent: Transaction[];
}

export interface OpResult {
  snapshot: CardSnapshot;
  transaction: Transaction;
  duplicate: boolean;
  unlocked: string[];
  tierChanged?: string;
  message: string;
}

function assertOperational(merchant: Merchant) {
  if (merchant.status === "suspended")
    throw new AppError("SUSPENDED", "Le compte de ce commerce est suspendu : les opérations de fidélité sont bloquées.");
  if (merchant.status === "cancelled") throw new AppError("SUSPENDED", "L'abonnement de ce commerce est résilié.");
}

/** Charge une carte en garantissant qu'elle appartient au commerce de l'acteur. */
export async function loadOwnedCard(ctx: OpContext, cardId: string): Promise<LoyaltyCard> {
  const card = await ctx.repos.cards.findById(cardId);
  // Même message si la carte existe chez un autre commerce : aucune fuite d'information.
  if (!card || card.merchantId !== ctx.merchant.id || card.status !== "active")
    throw new AppError("NOT_FOUND", "Carte introuvable pour ce commerce.");
  return card;
}

export async function expireIssuances(repos: Repositories, cardId: string, now = new Date()) {
  const list = await repos.issuances.findMany({ cardId, status: "available" });
  for (const iss of list) {
    if (new Date(iss.expiresAt).getTime() < now.getTime()) await repos.issuances.update(iss.id, { status: "expired" });
  }
}

export async function snapshotCard(repos: Repositories, card: LoyaltyCard): Promise<CardSnapshot> {
  await expireIssuances(repos, card.id);
  const [program, customer, rewards, issuances, txs] = await Promise.all([
    repos.programs.findById(card.programId),
    repos.customers.findById(card.customerId),
    repos.rewards.findMany({ programId: card.programId }),
    repos.issuances.findMany({ cardId: card.id }),
    repos.transactions.findMany({ cardId: card.id }),
  ]);
  if (!program || !customer) throw new AppError("NOT_FOUND", "Données de carte incomplètes.");
  const rewardName = new Map(rewards.map((r) => [r.id, r.name]));
  return {
    card: (await repos.cards.findById(card.id))!,
    program,
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      createdAt: customer.createdAt,
    },
    rewards,
    issuances: issuances
      .map((i) => ({ ...i, rewardName: rewardName.get(i.rewardId) ?? "Récompense" }))
      .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt)),
    recent: txs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15),
  };
}

async function findDuplicate(ctx: OpContext, key: string) {
  return ctx.repos.transactions.findOne({ merchantId: ctx.merchant.id, idempotencyKey: key });
}

async function resolveStore(ctx: OpContext, storeId?: string) {
  const stores = await ctx.repos.stores.findMany({ merchantId: ctx.merchant.id });
  const store = storeId ? stores.find((s) => s.id === storeId) : stores[0];
  if (!store) throw new AppError("NOT_FOUND", "Établissement introuvable.");
  return store;
}

async function issue(ctx: OpContext, reward: Reward, card: LoyaltyCard, at: Date, status: RewardIssuance["status"] = "available") {
  const iss: RewardIssuance = {
    id: newId("iss"),
    merchantId: ctx.merchant.id,
    rewardId: reward.id,
    cardId: card.id,
    customerId: card.customerId,
    status,
    unlockedAt: at.toISOString(),
    expiresAt: new Date(at.getTime() + reward.validityDays * DAY_MS).toISOString(),
  };
  await ctx.repos.issuances.insert(iss);
  await ctx.repos.rewards.update(reward.id, { issuedCount: reward.issuedCount + 1 });
  return iss;
}

export async function earn(
  ctx: OpContext,
  input: { cardId: string; amountCents: number | null; storeId?: string; idempotencyKey: string; override?: boolean },
): Promise<OpResult> {
  assertCan(ctx.actor, "scan");
  assertOperational(ctx.merchant);
  return ctx.repos.withLock(`card:${input.cardId}`, () =>
    ctx.repos.tx(async () => {
      const card = await loadOwnedCard(ctx, input.cardId);
      const dup = await findDuplicate(ctx, input.idempotencyKey);
      if (dup) {
        return { snapshot: await snapshotCard(ctx.repos, card), transaction: dup, duplicate: true, unlocked: [], message: "Opération déjà enregistrée (double envoi ignoré)." };
      }
      const now = ctx.now ?? new Date();
      // Anti-fraude : délai minimal entre deux passages sur la même carte.
      if (card.lastVisitAt && !input.override) {
        const elapsed = (now.getTime() - new Date(card.lastVisitAt).getTime()) / 1000;
        if (elapsed < ctx.merchant.settings.minSecondsBetweenVisits) {
          throw new AppError(
            "RATE_LIMIT",
            `Un passage a déjà été enregistré il y a ${Math.max(1, Math.round(elapsed))} s. Attendez ${ctx.merchant.settings.minSecondsBetweenVisits} s entre deux passages, ou confirmez un passage supplémentaire.`,
          );
        }
      }
      if (input.override && ctx.actor.role === "staff")
        throw new AppError("FORBIDDEN", "Seul un responsable peut forcer un passage rapproché.");

      const program = await ctx.repos.programs.findById(card.programId);
      if (!program || program.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Programme introuvable.");
      const store = await resolveStore(ctx, input.storeId);
      const res = computeEarn(program, card, { amountCents: input.amountCents }, { maxAmountCents: ctx.merchant.settings.maxAmountCents });

      const tx: Transaction = {
        id: newId("trx"),
        merchantId: ctx.merchant.id,
        storeId: store.id,
        programId: program.id,
        cardId: card.id,
        customerId: card.customerId,
        kind: "earn",
        amountCents: input.amountCents,
        stampsDelta: res.stampsDelta,
        pointsDelta: res.pointsDelta,
        cashbackDeltaCents: res.cashbackDeltaCents,
        ruleVersion: program.ruleVersion,
        ruleSummary: res.summary,
        actorUserId: ctx.actor.userId,
        idempotencyKey: input.idempotencyKey,
        createdAt: now.toISOString(),
        note: input.override ? "Passage rapproché confirmé par un responsable" : undefined,
      };
      await ctx.repos.transactions.insert(tx);
      await ctx.repos.cards.update(card.id, {
        stamps: res.stampsAfter,
        points: res.pointsAfter,
        lifetimePoints: res.lifetimePointsAfter,
        cashbackCents: res.cashbackAfterCents,
        tier: res.tierAfter,
        visits: card.visits + 1,
        totalSpentCents: card.totalSpentCents + (input.amountCents ?? 0),
        lastVisitAt: now.toISOString(),
      });

      const unlocked: string[] = [];
      const rewards = await ctx.repos.rewards.findMany({ programId: program.id });
      if (res.stampRewardsUnlocked > 0) {
        const main = rewards.find((r) => r.autoUnlock && r.active && r.cost > 0);
        if (main) {
          for (let i = 0; i < res.stampRewardsUnlocked; i++) {
            if (main.quantity !== null && main.issuedCount + i >= main.quantity) break;
            await issue(ctx, { ...main, issuedCount: main.issuedCount + i }, card, now);
            unlocked.push(main.name);
          }
        }
      }
      // Programmes à points : déblocage automatique (points réservés) si la récompense l'autorise.
      if (program.rules.type === "points" || program.rules.type === "tiers") {
        let balance = res.pointsAfter;
        for (const r of rewards.filter((r) => r.autoUnlock && r.active && r.cost > 0).sort((a, b) => a.cost - b.cost)) {
          const already = await ctx.repos.issuances.findOne({ cardId: card.id, rewardId: r.id, status: "available" });
          if (!already && balance >= r.cost && (r.quantity === null || r.issuedCount < r.quantity)) {
            balance -= r.cost;
            const iss = await issue(ctx, r, card, now);
            await ctx.repos.transactions.insert({
              ...tx,
              id: newId("trx"),
              kind: "redeem",
              amountCents: null,
              stampsDelta: 0,
              pointsDelta: -r.cost,
              cashbackDeltaCents: 0,
              rewardId: r.id,
              issuanceId: iss.id,
              ruleSummary: `Déblocage automatique : ${r.name} (−${r.cost} pts)`,
              idempotencyKey: `${input.idempotencyKey}:auto:${r.id}`,
            });
            unlocked.push(r.name);
          }
        }
        if (balance !== res.pointsAfter) await ctx.repos.cards.update(card.id, { points: balance });
      }

      const snapshot = await snapshotCard(ctx.repos, card);
      return {
        snapshot,
        transaction: tx,
        duplicate: false,
        unlocked,
        tierChanged: res.tierChanged ? res.tierAfter : undefined,
        message: res.summary,
      };
    }),
  );
}

export async function redeemIssuance(ctx: OpContext, input: { issuanceId: string; idempotencyKey: string; storeId?: string }): Promise<OpResult> {
  assertCan(ctx.actor, "redeem");
  assertOperational(ctx.merchant);
  const iss0 = await ctx.repos.issuances.findById(input.issuanceId);
  if (!iss0 || iss0.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Récompense introuvable.");
  return ctx.repos.withLock(`card:${iss0.cardId}`, () =>
    ctx.repos.tx(async () => {
      const card = await loadOwnedCard(ctx, iss0.cardId);
      const dup = await findDuplicate(ctx, input.idempotencyKey);
      if (dup) return { snapshot: await snapshotCard(ctx.repos, card), transaction: dup, duplicate: true, unlocked: [], message: "Opération déjà enregistrée (double envoi ignoré)." };
      const now = ctx.now ?? new Date();
      const iss = (await ctx.repos.issuances.findById(input.issuanceId))!; // relu sous verrou
      if (iss.status === "redeemed")
        throw new AppError("CONFLICT", `Cette récompense a déjà été utilisée le ${new Date(iss.redeemedAt!).toLocaleString("fr-FR")}.`);
      if (iss.status === "expired" || new Date(iss.expiresAt).getTime() < now.getTime()) {
        await ctx.repos.issuances.update(iss.id, { status: "expired" });
        throw new AppError("CONFLICT", "Cette récompense a expiré.");
      }
      const reward = await ctx.repos.rewards.findById(iss.rewardId);
      const program = await ctx.repos.programs.findById(card.programId);
      const store = await resolveStore(ctx, input.storeId);
      const tx: Transaction = {
        id: newId("trx"),
        merchantId: ctx.merchant.id,
        storeId: store.id,
        programId: card.programId,
        cardId: card.id,
        customerId: card.customerId,
        kind: "redeem",
        amountCents: null,
        stampsDelta: 0,
        pointsDelta: 0,
        cashbackDeltaCents: 0,
        rewardId: iss.rewardId,
        issuanceId: iss.id,
        ruleVersion: program?.ruleVersion ?? 1,
        ruleSummary: `Récompense utilisée : ${reward?.name ?? "—"}`,
        actorUserId: ctx.actor.userId,
        idempotencyKey: input.idempotencyKey,
        createdAt: now.toISOString(),
      };
      await ctx.repos.transactions.insert(tx);
      await ctx.repos.issuances.update(iss.id, { status: "redeemed", redeemedAt: tx.createdAt, redeemedBy: ctx.actor.userId, redeemTransactionId: tx.id });
      await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "reward.redeemed", target: reward?.name ?? iss.rewardId, metadata: { cardId: card.id } });
      return { snapshot: await snapshotCard(ctx.repos, card), transaction: tx, duplicate: false, unlocked: [], message: `${reward?.name ?? "Récompense"} utilisée.` };
    }),
  );
}

export async function redeemPointsReward(ctx: OpContext, input: { cardId: string; rewardId: string; idempotencyKey: string; storeId?: string }): Promise<OpResult> {
  assertCan(ctx.actor, "redeem");
  assertOperational(ctx.merchant);
  return ctx.repos.withLock(`card:${input.cardId}`, () =>
    ctx.repos.tx(async () => {
      const card = await loadOwnedCard(ctx, input.cardId);
      const dup = await findDuplicate(ctx, input.idempotencyKey);
      if (dup) return { snapshot: await snapshotCard(ctx.repos, card), transaction: dup, duplicate: true, unlocked: [], message: "Opération déjà enregistrée (double envoi ignoré)." };
      const reward = await ctx.repos.rewards.findById(input.rewardId);
      const program = await ctx.repos.programs.findById(card.programId);
      if (!reward || !program || reward.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Récompense introuvable.");
      if (program.rules.type !== "points" && program.rules.type !== "tiers")
        throw new LoyaltyError("REWARD_WRONG_PROGRAM", "Ce programme ne fonctionne pas avec des points.");
      const cost = checkPointsRedemption(program, card, reward);
      const now = ctx.now ?? new Date();
      const store = await resolveStore(ctx, input.storeId);
      const iss = await issue(ctx, reward, card, now, "redeemed");
      const tx: Transaction = {
        id: newId("trx"),
        merchantId: ctx.merchant.id,
        storeId: store.id,
        programId: program.id,
        cardId: card.id,
        customerId: card.customerId,
        kind: "redeem",
        amountCents: null,
        stampsDelta: 0,
        pointsDelta: -cost,
        cashbackDeltaCents: 0,
        rewardId: reward.id,
        issuanceId: iss.id,
        ruleVersion: program.ruleVersion,
        ruleSummary: `Échange : ${reward.name} (−${cost} pts)`,
        actorUserId: ctx.actor.userId,
        idempotencyKey: input.idempotencyKey,
        createdAt: now.toISOString(),
      };
      await ctx.repos.transactions.insert(tx);
      await ctx.repos.issuances.update(iss.id, { redeemedAt: tx.createdAt, redeemedBy: ctx.actor.userId, redeemTransactionId: tx.id });
      await ctx.repos.cards.update(card.id, { points: card.points - cost });
      await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "reward.redeemed", target: reward.name, metadata: { cardId: card.id, points: cost } });
      return { snapshot: await snapshotCard(ctx.repos, card), transaction: tx, duplicate: false, unlocked: [], message: `${reward.name} échangée contre ${cost} points.` };
    }),
  );
}

export async function useCashback(ctx: OpContext, input: { cardId: string; amountCents: number; idempotencyKey: string; storeId?: string }): Promise<OpResult> {
  assertCan(ctx.actor, "redeem");
  assertOperational(ctx.merchant);
  return ctx.repos.withLock(`card:${input.cardId}`, () =>
    ctx.repos.tx(async () => {
      const card = await loadOwnedCard(ctx, input.cardId);
      const dup = await findDuplicate(ctx, input.idempotencyKey);
      if (dup) return { snapshot: await snapshotCard(ctx.repos, card), transaction: dup, duplicate: true, unlocked: [], message: "Opération déjà enregistrée (double envoi ignoré)." };
      const program = await ctx.repos.programs.findById(card.programId);
      if (!program || program.rules.type !== "cashback") throw new LoyaltyError("REWARD_WRONG_PROGRAM", "Ce programme n'a pas de crédit cashback.");
      const amount = checkCashbackUse(card, input.amountCents);
      const now = ctx.now ?? new Date();
      const store = await resolveStore(ctx, input.storeId);
      const tx: Transaction = {
        id: newId("trx"),
        merchantId: ctx.merchant.id,
        storeId: store.id,
        programId: program.id,
        cardId: card.id,
        customerId: card.customerId,
        kind: "cashback_use",
        amountCents: null,
        stampsDelta: 0,
        pointsDelta: 0,
        cashbackDeltaCents: -amount,
        ruleVersion: program.ruleVersion,
        ruleSummary: "Crédit fidélité utilisé",
        actorUserId: ctx.actor.userId,
        idempotencyKey: input.idempotencyKey,
        createdAt: now.toISOString(),
      };
      await ctx.repos.transactions.insert(tx);
      await ctx.repos.cards.update(card.id, { cashbackCents: card.cashbackCents - amount });
      return { snapshot: await snapshotCard(ctx.repos, card), transaction: tx, duplicate: false, unlocked: [], message: "Crédit fidélité déduit." };
    }),
  );
}

/** Attribution manuelle d'une récompense (geste commercial, anniversaire). */
export async function giftReward(ctx: OpContext, input: { cardId: string; rewardId: string }) {
  assertCan(ctx.actor, "customers.write");
  assertOperational(ctx.merchant);
  return ctx.repos.withLock(`card:${input.cardId}`, () =>
    ctx.repos.tx(async () => {
      const card = await loadOwnedCard(ctx, input.cardId);
      const reward = await ctx.repos.rewards.findById(input.rewardId);
      if (!reward || reward.merchantId !== ctx.merchant.id || reward.programId !== card.programId)
        throw new AppError("NOT_FOUND", "Récompense introuvable.");
      if (!reward.active) throw new LoyaltyError("REWARD_INACTIVE", "Cette récompense est désactivée.");
      if (reward.quantity !== null && reward.issuedCount >= reward.quantity) throw new LoyaltyError("REWARD_OUT_OF_STOCK", "Stock épuisé.");
      const iss = await issue(ctx, reward, card, ctx.now ?? new Date());
      await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "reward.gifted", target: reward.name, metadata: { cardId: card.id } });
      return iss;
    }),
  );
}

/** Recherche de cartes (nom, email, téléphone, code) — limitée au commerce. */
export async function searchCards(ctx: OpContext, query: string, limit = 8) {
  assertCan(ctx.actor, "scan");
  const q = query.trim().toLowerCase();
  const customers = (await ctx.repos.customers.findMany({ merchantId: ctx.merchant.id })).filter((c) => !c.deletedAt);
  const cards = await ctx.repos.cards.findMany({ merchantId: ctx.merchant.id, status: "active" });
  const byCustomer = new Map(cards.map((c) => [c.customerId, c]));
  if (!q) {
    return cards
      .filter((c) => c.lastVisitAt)
      .sort((a, b) => b.lastVisitAt!.localeCompare(a.lastVisitAt!))
      .slice(0, limit)
      .map((card) => ({ card, customer: customers.find((c) => c.id === card.customerId)! }))
      .filter((x) => x.customer);
  }
  const normalizedCode = q.replace(/[^a-z0-9]/g, "");
  const out = [];
  for (const c of customers) {
    const card = byCustomer.get(c.id);
    if (!card) continue;
    const hay = `${c.firstName} ${c.lastName} ${c.email} ${c.phone.replace(/\s/g, "")}`.toLowerCase();
    if (hay.includes(q) || (normalizedCode.length >= 4 && card.scanCode.toLowerCase().replace(/[^a-z0-9]/g, "").includes(normalizedCode)))
      out.push({ card, customer: c });
    if (out.length >= limit) break;
  }
  return out;
}

/** Résolution du contenu d'un QR scanné. N'accepte que le format FDL-…, jamais d'URL arbitraire. */
export async function resolveScan(ctx: OpContext, raw: string) {
  assertCan(ctx.actor, "scan");
  const match = raw.trim().toUpperCase().match(/FDL-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}/);
  if (!match) throw new AppError("VALIDATION", "QR code non reconnu : ce n'est pas une carte Fidely.");
  const card = await ctx.repos.cards.findOne({ scanCode: match[0] });
  if (!card || card.merchantId !== ctx.merchant.id || card.status !== "active")
    throw new AppError("NOT_FOUND", "Cette carte n'appartient pas à votre commerce.");
  return snapshotCard(ctx.repos, card);
}

export { describeRules };
