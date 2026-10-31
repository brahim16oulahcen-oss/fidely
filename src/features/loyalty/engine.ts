/**
 * Moteur de fidélité — logique pure, indépendante de l'interface et du stockage.
 * Chaque calcul renvoie des deltas : les transactions passées ne sont jamais
 * recalculées lorsque les règles d'un programme changent (versionnage ruleVersion).
 */
import type {
  CashbackRules,
  LoyaltyCard,
  PointsRules,
  Program,
  ProgramRules,
  Reward,
  StampsRules,
  Tier,
  TiersRules,
} from "@/types/domain";

export interface EarnInput {
  amountCents: number | null;
}

export interface EarnResult {
  stampsDelta: number;
  pointsDelta: number;
  cashbackDeltaCents: number;
  /** Solde de tampons après conversion des récompenses débloquées. */
  stampsAfter: number;
  pointsAfter: number;
  lifetimePointsAfter: number;
  cashbackAfterCents: number;
  tierAfter: Tier;
  tierChanged: boolean;
  /** Nombre de récompenses « tampons » débloquées par ce passage. */
  stampRewardsUnlocked: number;
  summary: string;
}

export class LoyaltyError extends Error {
  constructor(
    public code:
      | "AMOUNT_REQUIRED"
      | "AMOUNT_INVALID"
      | "INSUFFICIENT_BALANCE"
      | "REWARD_INACTIVE"
      | "REWARD_OUT_OF_STOCK"
      | "REWARD_WRONG_PROGRAM"
      | "PROGRAM_INACTIVE",
    message: string,
  ) {
    super(message);
    this.name = "LoyaltyError";
  }
}

export function requiresAmount(rules: ProgramRules): boolean {
  return rules.type !== "stamps";
}

export function computeTier(lifetimePoints: number, rules: TiersRules): Tier {
  if (lifetimePoints >= rules.goldThreshold) return "gold";
  if (lifetimePoints >= rules.silverThreshold) return "silver";
  return "bronze";
}

export const TIER_LABEL: Record<Tier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };

export function describeRules(rules: ProgramRules): string {
  switch (rules.type) {
    case "stamps":
      return `${rules.stampsRequired} passages = ${rules.rewardName}`;
    case "points":
      return `1 € = ${rules.pointsPerEuro} point${rules.pointsPerEuro > 1 ? "s" : ""}`;
    case "cashback":
      return `${rules.percent} % crédités dès ${(rules.minPurchaseCents / 100).toFixed(0)} €`;
    case "tiers":
      return `1 € = ${rules.pointsPerEuro} pt · Silver ${rules.silverThreshold} pts · Gold ${rules.goldThreshold} pts`;
  }
}

function validateAmount(amountCents: number | null, required: boolean, maxCents = 1_000_000): number | null {
  if (amountCents === null || amountCents === undefined) {
    if (required) throw new LoyaltyError("AMOUNT_REQUIRED", "Le montant de l'achat est requis pour ce programme.");
    return null;
  }
  if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > maxCents) {
    throw new LoyaltyError("AMOUNT_INVALID", "Montant invalide.");
  }
  return amountCents;
}

export function computeEarn(
  program: Pick<Program, "rules" | "status">,
  card: Pick<LoyaltyCard, "stamps" | "points" | "lifetimePoints" | "cashbackCents" | "tier">,
  input: EarnInput,
  opts: { maxAmountCents?: number } = {},
): EarnResult {
  if (program.status !== "active") throw new LoyaltyError("PROGRAM_INACTIVE", "Ce programme est désactivé.");
  const rules = program.rules;
  const amount = validateAmount(input.amountCents, requiresAmount(rules), opts.maxAmountCents);
  const base: EarnResult = {
    stampsDelta: 0,
    pointsDelta: 0,
    cashbackDeltaCents: 0,
    stampsAfter: card.stamps,
    pointsAfter: card.points,
    lifetimePointsAfter: card.lifetimePoints,
    cashbackAfterCents: card.cashbackCents,
    tierAfter: card.tier,
    tierChanged: false,
    stampRewardsUnlocked: 0,
    summary: "",
  };

  switch (rules.type) {
    case "stamps": {
      const r = rules as StampsRules;
      const total = card.stamps + r.stampsPerVisit;
      const unlocked = Math.floor(total / r.stampsRequired);
      return {
        ...base,
        stampsDelta: r.stampsPerVisit,
        stampsAfter: total % r.stampsRequired,
        stampRewardsUnlocked: unlocked,
        summary: `+${r.stampsPerVisit} tampon${r.stampsPerVisit > 1 ? "s" : ""} (règle v: ${r.stampsRequired} = ${r.rewardName})`,
      };
    }
    case "points": {
      const r = rules as PointsRules;
      const pts = Math.floor(((amount ?? 0) / 100) * r.pointsPerEuro);
      return {
        ...base,
        pointsDelta: pts,
        pointsAfter: card.points + pts,
        lifetimePointsAfter: card.lifetimePoints + pts,
        summary: `+${pts} pts (${r.pointsPerEuro} pt/€)`,
      };
    }
    case "cashback": {
      const r = rules as CashbackRules;
      let credit = 0;
      if ((amount ?? 0) >= r.minPurchaseCents) {
        credit = Math.min(Math.round(((amount ?? 0) * r.percent) / 100), r.maxCreditPerTxCents);
      }
      return {
        ...base,
        cashbackDeltaCents: credit,
        cashbackAfterCents: card.cashbackCents + credit,
        summary:
          credit > 0
            ? `+${(credit / 100).toFixed(2).replace(".", ",")} € de crédit (${r.percent} %)`
            : `Montant inférieur au minimum de ${(r.minPurchaseCents / 100).toFixed(0)} €`,
      };
    }
    case "tiers": {
      const r = rules as TiersRules;
      const mult = r.multipliers[card.tier] ?? 1;
      const pts = Math.floor(((amount ?? 0) / 100) * r.pointsPerEuro * mult);
      const lifetime = card.lifetimePoints + pts;
      const tierAfter = computeTier(lifetime, r);
      return {
        ...base,
        pointsDelta: pts,
        pointsAfter: card.points + pts,
        lifetimePointsAfter: lifetime,
        tierAfter,
        tierChanged: tierAfter !== card.tier,
        summary: `+${pts} pts (×${mult} ${TIER_LABEL[card.tier]})`,
      };
    }
  }
}

/** Vérifie qu'une récompense « points » peut être échangée. Renvoie le coût à débiter. */
export function checkPointsRedemption(
  program: Pick<Program, "id" | "rules" | "status">,
  card: Pick<LoyaltyCard, "points" | "programId">,
  reward: Pick<Reward, "programId" | "active" | "cost" | "quantity" | "issuedCount">,
): number {
  if (program.status !== "active") throw new LoyaltyError("PROGRAM_INACTIVE", "Ce programme est désactivé.");
  if (reward.programId !== card.programId || reward.programId !== program.id)
    throw new LoyaltyError("REWARD_WRONG_PROGRAM", "Cette récompense n'appartient pas à ce programme.");
  if (!reward.active) throw new LoyaltyError("REWARD_INACTIVE", "Cette récompense est désactivée.");
  if (reward.quantity !== null && reward.issuedCount >= reward.quantity)
    throw new LoyaltyError("REWARD_OUT_OF_STOCK", "Stock épuisé pour cette récompense.");
  if (card.points < reward.cost)
    throw new LoyaltyError("INSUFFICIENT_BALANCE", `Solde insuffisant : ${card.points} / ${reward.cost} points.`);
  return reward.cost;
}

export function checkCashbackUse(card: Pick<LoyaltyCard, "cashbackCents">, amountCents: number): number {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new LoyaltyError("AMOUNT_INVALID", "Montant invalide.");
  if (amountCents > card.cashbackCents)
    throw new LoyaltyError("INSUFFICIENT_BALANCE", "Le crédit disponible est insuffisant.");
  return amountCents;
}

/** Progression vers la prochaine récompense (0..1) et libellé, pour l'affichage carte. */
export function progressOf(
  rules: ProgramRules,
  card: Pick<LoyaltyCard, "stamps" | "points" | "lifetimePoints" | "cashbackCents" | "tier">,
  rewards: Pick<Reward, "cost" | "active" | "name">[],
): { ratio: number; label: string; current: number; target: number } {
  switch (rules.type) {
    case "stamps":
      return {
        ratio: card.stamps / rules.stampsRequired,
        label: `${rules.stampsRequired - card.stamps} passage${rules.stampsRequired - card.stamps > 1 ? "s" : ""} avant : ${rules.rewardName}`,
        current: card.stamps,
        target: rules.stampsRequired,
      };
    case "points": {
      const next = rewards
        .filter((r) => r.active && r.cost > card.points)
        .sort((a, b) => a.cost - b.cost)[0];
      if (!next) {
        const max = rewards.filter((r) => r.active).sort((a, b) => b.cost - a.cost)[0];
        return { ratio: 1, label: "Récompenses disponibles !", current: card.points, target: max?.cost ?? card.points };
      }
      return {
        ratio: card.points / next.cost,
        label: `${next.cost - card.points} pts avant : ${next.name}`,
        current: card.points,
        target: next.cost,
      };
    }
    case "cashback":
      return { ratio: 1, label: "Crédit utilisable lors de votre prochain passage", current: card.cashbackCents, target: card.cashbackCents };
    case "tiers": {
      if (card.tier === "gold") return { ratio: 1, label: "Niveau Gold atteint", current: card.lifetimePoints, target: rules.goldThreshold };
      const target = card.tier === "bronze" ? rules.silverThreshold : rules.goldThreshold;
      const nextTier = card.tier === "bronze" ? "Silver" : "Gold";
      return {
        ratio: card.lifetimePoints / target,
        label: `${target - card.lifetimePoints} pts avant le niveau ${nextTier}`,
        current: card.lifetimePoints,
        target,
      };
    }
  }
}

export function defaultRulesFor(type: Program["type"]): ProgramRules {
  switch (type) {
    case "stamps":
      return { type, stampsRequired: 10, stampsPerVisit: 1, rewardName: "1 café offert", rewardValidityDays: 60 };
    case "points":
      return { type, pointsPerEuro: 1, welcomePoints: 10 };
    case "cashback":
      return { type, percent: 5, minPurchaseCents: 1000, maxCreditPerTxCents: 2000 };
    case "tiers":
      return {
        type,
        pointsPerEuro: 1,
        silverThreshold: 300,
        goldThreshold: 800,
        multipliers: { bronze: 1, silver: 1.25, gold: 1.5 },
        benefits: { bronze: "Accès au programme", silver: "Points ×1,25", gold: "Points ×1,5 et soin offert annuel" },
      };
  }
}

export const PROGRAM_TYPE_LABEL: Record<Program["type"], string> = {
  stamps: "Tampons",
  points: "Points",
  cashback: "Cashback fidélité",
  tiers: "Niveaux VIP",
};
