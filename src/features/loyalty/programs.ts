import "server-only";
import type { Repositories } from "@/lib/db/repository";
import { AppError, assertCan, type MerchantActor } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/utils/ids";
import { getPlan } from "@/config/plans";
import type { CardDesign, Merchant, Program, ProgramRules, Reward } from "@/types/domain";
import { cardDesignSchema, programInputSchema, rewardInputSchema } from "./schemas";
import { describeRules, PROGRAM_TYPE_LABEL } from "./engine";
import type { z } from "zod";

export interface MerchantCtx {
  repos: Repositories;
  actor: MerchantActor;
  merchant: Merchant;
}

function assertTypeAllowed(merchant: Merchant, type: Program["type"]) {
  const plan = getPlan(merchant.planId);
  if (!plan.programTypes.includes(type))
    throw new AppError("LIMIT", `Le programme « ${PROGRAM_TYPE_LABEL[type]} » n'est pas inclus dans l'offre ${plan.name}. Passez à une offre supérieure depuis la page Abonnement.`);
}

export function defaultCardDesign(merchant: Pick<Merchant, "colors" | "name">, title: string, rewardText: string): CardDesign {
  return {
    title,
    background: merchant.colors.primary,
    text: merchant.colors.text,
    accent: merchant.colors.accent,
    showLogo: true,
    rewardText,
    terms: "Programme nominatif, sans obligation d'achat. Récompenses non échangeables contre de l'argent.",
  };
}

/** Pour un programme à tampons, la récompense principale suit la règle (coût = nombre de tampons). */
async function syncStampsReward(repos: Repositories, program: Program, merchantId: string) {
  if (program.rules.type !== "stamps") return;
  const rewards = await repos.rewards.findMany({ programId: program.id });
  const main = rewards.find((r) => r.autoUnlock && r.cost > 0);
  if (main) {
    await repos.rewards.update(main.id, {
      cost: program.rules.stampsRequired,
      name: main.name,
      validityDays: program.rules.rewardValidityDays,
    });
  } else {
    await repos.rewards.insert({
      id: newId("rwd"),
      merchantId,
      programId: program.id,
      name: program.rules.rewardName.replace(/^1 /, "").replace(/^./, (c) => c.toUpperCase()),
      description: `Débloquée automatiquement après ${program.rules.stampsRequired} passages.`,
      cost: program.rules.stampsRequired,
      validityDays: program.rules.rewardValidityDays,
      quantity: null,
      issuedCount: 0,
      active: true,
      autoUnlock: true,
      createdAt: new Date().toISOString(),
    });
  }
}

export async function createProgram(ctx: MerchantCtx, raw: z.input<typeof programInputSchema>) {
  assertCan(ctx.actor, "programs.manage");
  const input = programInputSchema.parse(raw);
  assertTypeAllowed(ctx.merchant, input.rules.type);
  const plan = getPlan(ctx.merchant.planId);
  const existing = await ctx.repos.programs.count({ merchantId: ctx.merchant.id });
  if (existing >= plan.limits.programs)
    throw new AppError("LIMIT", `Votre offre ${plan.name} permet ${plan.limits.programs} programme(s). Passez à une offre supérieure pour en créer davantage.`);
  return ctx.repos.tx(async () => {
    const now = new Date().toISOString();
    const program: Program = {
      id: newId("prg"),
      merchantId: ctx.merchant.id,
      name: input.name,
      type: input.rules.type,
      status: existing === 0 ? "active" : "inactive",
      rules: input.rules as ProgramRules,
      ruleVersion: 1,
      card: defaultCardDesign(ctx.merchant, input.name, input.rules.type === "stamps" ? input.rules.rewardName : ""),
      createdAt: now,
      updatedAt: now,
    };
    await ctx.repos.programs.insert(program);
    await syncStampsReward(ctx.repos, program, ctx.merchant.id);
    if (!ctx.merchant.primaryProgramId) await ctx.repos.merchants.update(ctx.merchant.id, { primaryProgramId: program.id });
    await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "program.created", target: program.name, metadata: { type: program.type } });
    return program;
  });
}

export async function updateProgram(ctx: MerchantCtx, programId: string, raw: z.input<typeof programInputSchema>) {
  assertCan(ctx.actor, "programs.manage");
  const input = programInputSchema.parse(raw);
  const program = await ctx.repos.programs.findById(programId);
  if (!program || program.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Programme introuvable.");
  if (input.rules.type !== program.type) throw new AppError("VALIDATION", "Le type d'un programme ne peut pas être modifié. Créez un nouveau programme.");
  return ctx.repos.tx(async () => {
    const rulesChanged = JSON.stringify(program.rules) !== JSON.stringify(input.rules);
    const updated = await ctx.repos.programs.update(program.id, {
      name: input.name,
      rules: input.rules as ProgramRules,
      // Nouvelle version des règles : les transactions passées conservent leur version.
      ruleVersion: rulesChanged ? program.ruleVersion + 1 : program.ruleVersion,
      updatedAt: new Date().toISOString(),
      card: { ...program.card, rewardText: input.rules.type === "stamps" ? input.rules.rewardName : program.card.rewardText },
    });
    await syncStampsReward(ctx.repos, updated, ctx.merchant.id);
    if (rulesChanged)
      await audit(ctx.repos, {
        actorUserId: ctx.actor.userId,
        actorLabel: ctx.actor.name,
        merchantId: ctx.merchant.id,
        action: "program.rules_updated",
        target: updated.name,
        metadata: { from: describeRules(program.rules), to: describeRules(updated.rules), version: updated.ruleVersion },
      });
    return updated;
  });
}

export async function setProgramStatus(ctx: MerchantCtx, programId: string, status: Program["status"]) {
  assertCan(ctx.actor, "programs.manage");
  const program = await ctx.repos.programs.findById(programId);
  if (!program || program.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Programme introuvable.");
  if (status === "active") assertTypeAllowed(ctx.merchant, program.type);
  return ctx.repos.tx(async () => {
    const updated = await ctx.repos.programs.update(programId, { status, updatedAt: new Date().toISOString() });
    if (status === "inactive" && ctx.merchant.primaryProgramId === programId) {
      const other = (await ctx.repos.programs.findMany({ merchantId: ctx.merchant.id, status: "active" }))[0];
      await ctx.repos.merchants.update(ctx.merchant.id, { primaryProgramId: other?.id ?? programId });
    }
    if (status === "active" && !ctx.merchant.primaryProgramId) await ctx.repos.merchants.update(ctx.merchant.id, { primaryProgramId: programId });
    await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: status === "active" ? "program.activated" : "program.deactivated", target: program.name });
    return updated;
  });
}

export async function setPrimaryProgram(ctx: MerchantCtx, programId: string) {
  assertCan(ctx.actor, "programs.manage");
  const program = await ctx.repos.programs.findById(programId);
  if (!program || program.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Programme introuvable.");
  if (program.status !== "active") throw new AppError("VALIDATION", "Activez le programme avant d'en faire le programme d'inscription.");
  await ctx.repos.merchants.update(ctx.merchant.id, { primaryProgramId: programId });
}

export async function updateCardDesign(ctx: MerchantCtx, programId: string, raw: unknown) {
  assertCan(ctx.actor, "cards.manage");
  const design = cardDesignSchema.parse(raw);
  const program = await ctx.repos.programs.findById(programId);
  if (!program || program.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Programme introuvable.");
  const updated = await ctx.repos.programs.update(programId, { card: design, updatedAt: new Date().toISOString() });
  await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "card.design_updated", target: program.name });
  return updated;
}

// ── Récompenses ─────────────────────────────────────────────────

export async function upsertReward(ctx: MerchantCtx, rewardId: string | null, raw: z.input<typeof rewardInputSchema>) {
  assertCan(ctx.actor, "rewards.manage");
  const input = rewardInputSchema.parse(raw);
  const program = await ctx.repos.programs.findById(input.programId);
  if (!program || program.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Programme introuvable.");
  if (program.type === "cashback" && input.cost > 0)
    throw new AppError("VALIDATION", "Pour un programme cashback, les récompenses sont des cadeaux (coût 0). Le crédit s'utilise directement en caisse.");
  return ctx.repos.tx(async () => {
    if (rewardId) {
      const existing = await ctx.repos.rewards.findById(rewardId);
      if (!existing || existing.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Récompense introuvable.");
      if (input.quantity !== null && input.quantity < existing.issuedCount)
        throw new AppError("VALIDATION", `La quantité ne peut pas être inférieure aux ${existing.issuedCount} récompenses déjà émises.`);
      const updated = await ctx.repos.rewards.update(rewardId, { ...input, description: input.description ?? "" });
      if (program.rules.type === "stamps" && existing.autoUnlock && existing.cost > 0 && input.cost !== program.rules.stampsRequired) {
        await ctx.repos.programs.update(program.id, {
          rules: { ...program.rules, stampsRequired: input.cost },
          ruleVersion: program.ruleVersion + 1,
          updatedAt: new Date().toISOString(),
        });
      }
      await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "reward.updated", target: updated.name });
      return updated;
    }
    const reward: Reward = {
      id: newId("rwd"),
      merchantId: ctx.merchant.id,
      ...input,
      description: input.description ?? "",
      issuedCount: 0,
      createdAt: new Date().toISOString(),
    };
    await ctx.repos.rewards.insert(reward);
    await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "reward.created", target: reward.name });
    return reward;
  });
}

export async function setRewardActive(ctx: MerchantCtx, rewardId: string, active: boolean) {
  assertCan(ctx.actor, "rewards.manage");
  const r = await ctx.repos.rewards.findById(rewardId);
  if (!r || r.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Récompense introuvable.");
  await ctx.repos.rewards.update(rewardId, { active });
  await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: active ? "reward.activated" : "reward.deactivated", target: r.name });
}
