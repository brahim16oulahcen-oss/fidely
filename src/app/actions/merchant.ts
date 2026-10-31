"use server";
import { merchantAction } from "./_helpers";
import { createProgram, setPrimaryProgram, setProgramStatus, updateCardDesign, updateProgram, upsertReward, setRewardActive } from "@/features/loyalty/programs";
import { staffEnrollCustomer, updateConsentByMerchant } from "@/features/customers/service";
import { addStore, changeMemberRole, inviteMember, removeMember, updateBranding, updateSettings } from "@/features/merchants/service";
import { changePlan } from "@/features/subscriptions/service";
import { createTicket } from "@/features/admin/service";
import type { EnrollInput } from "@/features/customers/schemas";
import type { PlanId } from "@/types/domain";
import { z } from "zod";
import { programInputSchema, rewardInputSchema } from "@/features/loyalty/schemas";

export async function createProgramAction(input: z.input<typeof programInputSchema>) {
  return merchantAction("programs.manage", (ctx) => createProgram(ctx, input), "Programme créé.");
}
export async function updateProgramAction(id: string, input: z.input<typeof programInputSchema>) {
  return merchantAction("programs.manage", (ctx) => updateProgram(ctx, String(id), input), "Programme mis à jour. Les nouvelles règles s'appliquent aux prochains passages.");
}
export async function setProgramStatusAction(id: string, active: boolean) {
  return merchantAction("programs.manage", (ctx) => setProgramStatus(ctx, String(id), active ? "active" : "inactive"), active ? "Programme activé." : "Programme désactivé.");
}
export async function setPrimaryProgramAction(id: string) {
  return merchantAction("programs.manage", (ctx) => setPrimaryProgram(ctx, String(id)), "Programme d'inscription mis à jour.");
}
export async function updateCardDesignAction(programId: string, design: unknown) {
  return merchantAction("cards.manage", (ctx) => updateCardDesign(ctx, String(programId), design).then(() => true), "Carte enregistrée. Les cartes clients sont mises à jour.");
}
export async function upsertRewardAction(id: string | null, input: z.input<typeof rewardInputSchema>) {
  return merchantAction("rewards.manage", (ctx) => upsertReward(ctx, id, input), id ? "Récompense mise à jour." : "Récompense créée.");
}
export async function setRewardActiveAction(id: string, active: boolean) {
  return merchantAction("rewards.manage", (ctx) => setRewardActive(ctx, String(id), Boolean(active)), active ? "Récompense activée." : "Récompense désactivée.");
}
export async function staffEnrollAction(input: EnrollInput) {
  return merchantAction("customers.write", async (ctx) => {
    const { customer } = await staffEnrollCustomer(ctx, input);
    return { id: customer.id };
  }, "Client inscrit.");
}
export async function updateConsentAction(customerId: string, consent: unknown) {
  return merchantAction("customers.write", (ctx) => updateConsentByMerchant(ctx, String(customerId), consent), "Préférences mises à jour.");
}
export async function updateSettingsAction(input: unknown) {
  return merchantAction("settings.manage", (ctx) => updateSettings(ctx, input), "Paramètres enregistrés.");
}
export async function updateBrandingAction(input: unknown) {
  return merchantAction("settings.manage", (ctx) => updateBranding(ctx, input), "Identité visuelle enregistrée.");
}
export async function inviteMemberAction(input: unknown) {
  return merchantAction("team.manage", (ctx) => inviteMember(ctx, input).then((u) => ({ email: u.email })), "Membre ajouté (invitation simulée).");
}
export async function changeMemberRoleAction(userId: string, role: "manager" | "staff") {
  return merchantAction("team.manage", (ctx) => changeMemberRole(ctx, String(userId), role === "manager" ? "manager" : "staff"), "Rôle modifié.");
}
export async function removeMemberAction(userId: string) {
  return merchantAction("team.manage", (ctx) => removeMember(ctx, String(userId)), "Membre retiré.");
}
export async function addStoreAction(input: unknown) {
  return merchantAction("settings.manage", (ctx) => addStore(ctx, input), "Établissement ajouté.");
}
export async function changePlanAction(planId: PlanId) {
  return merchantAction("billing.manage", (ctx) => changePlan(ctx, planId), "Offre modifiée (simulation : aucun paiement effectué).");
}
export async function createTicketAction(input: unknown) {
  return merchantAction(undefined, (ctx) => createTicket(ctx.repos, ctx.merchant.id, input), "Demande envoyée à l'équipe Fidely.");
}
