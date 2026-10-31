"use server";
import { revalidatePath } from "next/cache";
import { getRepos } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/context";
import { toActionError, type ActionResult } from "@/lib/action-result";
import { adminChangePlan, reactivateMerchant, suspendMerchant, updateTicketStatus } from "@/features/admin/service";
import type { PlanId } from "@/types/domain";

async function run<T>(fn: (user: Awaited<ReturnType<typeof requireAdmin>>) => Promise<T>, message: string): Promise<ActionResult<T>> {
  try {
    const user = await requireAdmin();
    const data = await fn(user);
    revalidatePath("/", "layout");
    return { ok: true, data, message };
  } catch (e) {
    return toActionError(e);
  }
}

export async function suspendMerchantAction(merchantId: string, reason: string) {
  return run((u) => suspendMerchant(getRepos(), u, String(merchantId), { reason }), "Commerce suspendu.");
}
export async function reactivateMerchantAction(merchantId: string) {
  return run((u) => reactivateMerchant(getRepos(), u, String(merchantId)), "Commerce réactivé.");
}
export async function adminChangePlanAction(merchantId: string, planId: PlanId) {
  return run((u) => adminChangePlan(getRepos(), u, String(merchantId), planId), "Abonnement fictif modifié.");
}
export async function updateTicketStatusAction(ticketId: string, status: "open" | "pending" | "resolved") {
  return run((u) => updateTicketStatus(getRepos(), u, String(ticketId), status), "Ticket mis à jour.");
}
