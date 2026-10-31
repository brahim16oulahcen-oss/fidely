import "server-only";
import type { Repositories } from "@/lib/db/repository";
import { AppError, assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/utils/ids";
import { DAY_MS } from "@/lib/utils/dates";
import { getPlan, PLAN_ORDER } from "@/config/plans";
import { getBillingProvider } from "@/lib/billing";
import type { Merchant, PlanId } from "@/types/domain";
import type { MerchantCtx } from "@/features/loyalty/programs";

export async function getUsage(repos: Repositories, merchant: Merchant) {
  const [customers, users, stores, programs] = await Promise.all([
    repos.customers.findMany({ merchantId: merchant.id }),
    repos.users.findMany(),
    repos.stores.count({ merchantId: merchant.id }),
    repos.programs.findMany({ merchantId: merchant.id }),
  ]);
  const staff = users.filter((u) => u.memberships.some((m) => m.merchantId === merchant.id && m.role !== "owner")).length;
  return {
    customers: customers.filter((c) => !c.deletedAt).length,
    staff,
    stores,
    programs: programs.length,
    programTypes: [...new Set(programs.filter((p) => p.status === "active").map((p) => p.type))],
  };
}

/** Vérifie qu'un changement d'offre est compatible avec l'usage actuel. */
export function planChangeBlockers(usage: Awaited<ReturnType<typeof getUsage>>, planId: PlanId): string[] {
  const plan = getPlan(planId);
  const out: string[] = [];
  if (usage.customers > plan.limits.customers) out.push(`${usage.customers} clients pour une limite de ${plan.limits.customers}.`);
  if (usage.staff > plan.limits.staff) out.push(`${usage.staff} membres d'équipe pour une limite de ${plan.limits.staff}.`);
  if (usage.stores > plan.limits.stores) out.push(`${usage.stores} établissements pour une limite de ${plan.limits.stores}.`);
  if (usage.programs > plan.limits.programs) out.push(`${usage.programs} programmes pour une limite de ${plan.limits.programs}.`);
  const unsupported = usage.programTypes.filter((t) => !plan.programTypes.includes(t));
  if (unsupported.length) out.push(`Programme actif non inclus dans cette offre (${unsupported.join(", ")}). Désactivez-le d'abord.`);
  return out;
}

export async function applyPlanChange(repos: Repositories, merchant: Merchant, planId: PlanId, actor: { userId: string | null; name: string }) {
  if (!PLAN_ORDER.includes(planId)) throw new AppError("VALIDATION", "Offre inconnue.");
  if (merchant.planId === planId) throw new AppError("CONFLICT", "Cette offre est déjà active.");
  const usage = await getUsage(repos, merchant);
  const blockers = planChangeBlockers(usage, planId);
  if (blockers.length) throw new AppError("LIMIT", `Changement impossible : ${blockers.join(" ")}`);
  const result = await getBillingProvider().changePlan({ merchantId: merchant.id, planId });
  if (result.status !== "applied") throw new AppError("NOT_CONFIGURED", "Le changement doit être confirmé chez le prestataire de paiement.");
  return repos.tx(async () => {
    const now = Date.now();
    const plan = getPlan(planId);
    await repos.merchants.update(merchant.id, { planId, status: merchant.status === "trial" ? "active" : merchant.status });
    const sub = await repos.subscriptions.findById(merchant.id);
    const subPatch = { planId, status: "active" as const, currentPeriodEnd: new Date(now + 30 * DAY_MS).toISOString() };
    if (sub) await repos.subscriptions.update(merchant.id, subPatch);
    else await repos.subscriptions.insert({ merchantId: merchant.id, startedAt: new Date(now).toISOString(), provider: "demo", ...subPatch });
    const count = await repos.invoices.count();
    await repos.invoices.insert({
      id: newId("inv"),
      merchantId: merchant.id,
      number: `DEMO-${new Date(now).getFullYear()}-${String(count + 1).padStart(4, "0")}`,
      planId,
      amountCents: plan.priceCents,
      issuedAt: new Date(now).toISOString(),
      periodStart: new Date(now).toISOString(),
      periodEnd: new Date(now + 30 * DAY_MS).toISOString(),
      status: "paid",
    });
    await audit(repos, { actorUserId: actor.userId, actorLabel: actor.name, merchantId: merchant.id, action: "subscription.plan_changed", target: merchant.name, metadata: { from: merchant.planId, to: planId, simulated: true } });
    return planId;
  });
}

export async function changePlan(ctx: MerchantCtx, planId: PlanId) {
  assertCan(ctx.actor, "billing.manage");
  return applyPlanChange(ctx.repos, ctx.merchant, planId, { userId: ctx.actor.userId, name: ctx.actor.name });
}

export async function getBilling(ctx: MerchantCtx) {
  assertCan(ctx.actor, "billing.manage");
  const [subscription, invoices, usage] = await Promise.all([
    ctx.repos.subscriptions.findById(ctx.merchant.id),
    ctx.repos.invoices.findMany({ merchantId: ctx.merchant.id }),
    getUsage(ctx.repos, ctx.merchant),
  ]);
  return { subscription, invoices: invoices.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)), usage, provider: getBillingProvider() };
}
