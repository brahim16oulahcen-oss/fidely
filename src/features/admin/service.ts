import "server-only";
import { z } from "zod";
import type { Repositories } from "@/lib/db/repository";
import { AppError } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { getPlan, PLAN_ORDER } from "@/config/plans";
import { DAY_MS } from "@/lib/utils/dates";
import type { PlanId, User } from "@/types/domain";
import { applyPlanChange } from "@/features/subscriptions/service";

function assertAdmin(user: User) {
  if (!user.isPlatformAdmin) throw new AppError("FORBIDDEN", "Accès réservé aux administrateurs Fidely.");
}

export async function platformOverview(repos: Repositories, user: User) {
  assertAdmin(user);
  const [merchants, subs, cards, txs, invoices, tickets, customers] = await Promise.all([
    repos.merchants.findMany(),
    repos.subscriptions.findMany(),
    repos.cards.findMany(),
    repos.transactions.findMany(),
    repos.invoices.findMany(),
    repos.tickets.findMany(),
    repos.customers.findMany(),
  ]);
  const paying = subs.filter((s) => s.status === "active" || s.status === "past_due");
  const mrr = paying.reduce((s, x) => s + getPlan(x.planId).priceCents, 0);
  const now = Date.now();
  const monthKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const mrrSeries = monthKeys.map((k) => {
    const [y, m] = k.split("-").map(Number);
    const end = new Date(y, m, 0, 23, 59).getTime();
    const value = subs
      .filter((s) => new Date(s.startedAt).getTime() <= end && (!s.cancelledAt || new Date(s.cancelledAt).getTime() > end) && s.status !== "trialing")
      .reduce((sum, s) => sum + getPlan(s.planId).priceCents, 0);
    return { mois: new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "short" }), mrr: value / 100 };
  });
  const txSeries = monthKeys.map((k) => ({
    mois: new Date(Number(k.slice(0, 4)), Number(k.slice(5)) - 1, 1).toLocaleDateString("fr-FR", { month: "short" }),
    transactions: txs.filter((t) => t.createdAt.startsWith(k)).length,
  }));
  return {
    merchants: merchants.length,
    activeMerchants: merchants.filter((m) => m.status === "active" || m.status === "trial").length,
    trialMerchants: merchants.filter((m) => m.status === "trial").length,
    suspended: merchants.filter((m) => m.status === "suspended").length,
    mrr,
    arr: mrr * 12,
    cards: cards.filter((c) => c.status === "active").length,
    customers: customers.filter((c) => !c.deletedAt).length,
    transactions: txs.length,
    transactions30: txs.filter((t) => now - new Date(t.createdAt).getTime() < 30 * DAY_MS).length,
    byPlan: PLAN_ORDER.map((p) => ({ name: getPlan(p).name, value: subs.filter((s) => s.planId === p && s.status !== "cancelled").length })),
    churned: subs.filter((s) => s.status === "cancelled").length,
    churned90: subs.filter((s) => s.cancelledAt && now - new Date(s.cancelledAt).getTime() < 90 * DAY_MS).length,
    revenueCollected: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amountCents, 0),
    openInvoices: invoices.filter((i) => i.status === "open").reduce((s, i) => s + i.amountCents, 0),
    openTickets: tickets.filter((t) => t.status !== "resolved").length,
    mrrSeries,
    txSeries,
  };
}

export async function listMerchantsAdmin(repos: Repositories, user: User) {
  assertAdmin(user);
  const [merchants, subs, customers, txs, users] = await Promise.all([
    repos.merchants.findMany(),
    repos.subscriptions.findMany(),
    repos.customers.findMany(),
    repos.transactions.findMany(),
    repos.users.findMany(),
  ]);
  const now = Date.now();
  return merchants.map((m) => {
    const owner = users.find((u) => u.memberships.some((x) => x.merchantId === m.id && x.role === "owner"));
    const mtx = txs.filter((t) => t.merchantId === m.id);
    return {
      merchant: m,
      subscription: subs.find((s) => s.merchantId === m.id) ?? null,
      owner: owner ? { name: owner.name, email: owner.email } : null,
      customers: customers.filter((c) => c.merchantId === m.id && !c.deletedAt).length,
      transactions: mtx.length,
      transactions30: mtx.filter((t) => now - new Date(t.createdAt).getTime() < 30 * DAY_MS).length,
      lastActivity: mtx.reduce<string | null>((max, t) => (!max || t.createdAt > max ? t.createdAt : max), null),
    };
  });
}

export async function merchantAdminDetail(repos: Repositories, user: User, merchantId: string) {
  assertAdmin(user);
  const list = await listMerchantsAdmin(repos, user);
  const row = list.find((r) => r.merchant.id === merchantId);
  if (!row) throw new AppError("NOT_FOUND", "Commerce introuvable.");
  const [tickets, invoices, logs, programs, stores] = await Promise.all([
    repos.tickets.findMany({ merchantId }),
    repos.invoices.findMany({ merchantId }),
    repos.auditLogs.findMany({ merchantId }),
    repos.programs.findMany({ merchantId }),
    repos.stores.findMany({ merchantId }),
  ]);
  return {
    ...row,
    tickets: tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    invoices: invoices.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    logs: logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30),
    programs,
    stores,
  };
}

export const suspendSchema = z.object({ reason: z.string().trim().min(5, "Indiquez un motif (5 caractères minimum)").max(200) });

export async function suspendMerchant(repos: Repositories, user: User, merchantId: string, raw: unknown) {
  assertAdmin(user);
  const { reason } = suspendSchema.parse(raw);
  const m = await repos.merchants.findById(merchantId);
  if (!m) throw new AppError("NOT_FOUND", "Commerce introuvable.");
  if (m.status === "suspended") throw new AppError("CONFLICT", "Ce commerce est déjà suspendu.");
  await repos.merchants.update(merchantId, { status: "suspended", suspendedReason: reason });
  await audit(repos, { actorUserId: user.id, actorLabel: user.name, merchantId, action: "merchant.suspended", target: m.name, metadata: { reason } });
}

export async function reactivateMerchant(repos: Repositories, user: User, merchantId: string) {
  assertAdmin(user);
  const m = await repos.merchants.findById(merchantId);
  if (!m) throw new AppError("NOT_FOUND", "Commerce introuvable.");
  if (m.status !== "suspended") throw new AppError("CONFLICT", "Ce commerce n'est pas suspendu.");
  await repos.tx(async () => {
    await repos.merchants.update(merchantId, { status: "active", suspendedReason: undefined });
    const sub = await repos.subscriptions.findById(merchantId);
    if (sub?.status === "past_due") await repos.subscriptions.update(merchantId, { status: "active" });
    await audit(repos, { actorUserId: user.id, actorLabel: user.name, merchantId, action: "merchant.reactivated", target: m.name });
  });
}

export async function adminChangePlan(repos: Repositories, user: User, merchantId: string, planId: PlanId) {
  assertAdmin(user);
  const m = await repos.merchants.findById(merchantId);
  if (!m) throw new AppError("NOT_FOUND", "Commerce introuvable.");
  return applyPlanChange(repos, m, planId, { userId: user.id, name: `${user.name} (admin)` });
}

export async function updateTicketStatus(repos: Repositories, user: User, ticketId: string, status: "open" | "pending" | "resolved") {
  assertAdmin(user);
  const t = await repos.tickets.findById(ticketId);
  if (!t) throw new AppError("NOT_FOUND", "Ticket introuvable.");
  await repos.tickets.update(ticketId, { status, updatedAt: new Date().toISOString() });
  await audit(repos, { actorUserId: user.id, actorLabel: user.name, merchantId: t.merchantId, action: "ticket.status_changed", target: t.subject, metadata: { status } });
}

export async function createTicket(repos: Repositories, merchantId: string, raw: unknown) {
  const input = z.object({
    subject: z.string().trim().min(3, "Objet requis").max(100),
    body: z.string().trim().min(10, "Décrivez votre demande (10 caractères minimum)").max(2000),
    kind: z.enum(["question", "incident", "billing"]),
  }).parse(raw);
  const now = new Date().toISOString();
  await repos.tickets.insert({ id: `tkt_${Date.now().toString(36)}`, merchantId, ...input, status: "open", priority: input.kind === "incident" ? "high" : "normal", createdAt: now, updatedAt: now });
}
