"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getRepos } from "@/lib/db";
import { clearSession, readSession, writeSession } from "@/lib/auth/session";
import { authenticate, registerOwner, requestPasswordReset, resetPassword, verifyEmail } from "@/features/auth/service";
import { createMerchantFromOnboarding, type OnboardingInput } from "@/features/merchants/service";
import { toActionError, type ActionResult } from "@/lib/action-result";
import { AppError } from "@/lib/auth/permissions";
import { env } from "@/config/env";
import type { User } from "@/types/domain";

function safeNext(next: unknown): string | null {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

function homeFor(user: User) {
  if (user.isPlatformAdmin) return "/admin";
  if (user.memberships.length === 0) return user.emailVerified ? "/onboarding" : "/verification-email";
  if (user.memberships.length > 1) return "/choix-commerce";
  return "/app";
}

export async function loginAction(input: { email: string; password: string; next?: string }): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
    const user = await authenticate(getRepos(), input, ip);
    await writeSession(user.id, user.memberships[0]?.merchantId ?? null);
    const next = safeNext(input.next);
    return { ok: true, data: { redirectTo: next && !user.isPlatformAdmin && user.memberships.length === 1 ? next : homeFor(user) } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function signupAction(input: { name: string; email: string; password: string; acceptTerms: boolean }): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const user = await registerOwner(getRepos(), { ...input, acceptTerms: input.acceptTerms as true });
    await writeSession(user.id, null);
    return { ok: true, data: { redirectTo: "/verification-email" } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function verifyEmailAction(code: string): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const s = await readSession();
    if (!s) throw new AppError("UNAUTHENTICATED", "Session expirée.");
    await verifyEmail(getRepos(), s.uid, String(code));
    return { ok: true, data: { redirectTo: "/onboarding" } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function logoutAction() {
  await clearSession();
  redirect("/connexion");
}

export async function switchMerchantAction(merchantId: string) {
  const s = await readSession();
  if (!s) redirect("/connexion");
  const user = await getRepos().users.findById(s.uid);
  // On ne peut basculer que vers un commerce dont on est membre.
  if (!user || !user.memberships.some((m) => m.merchantId === merchantId)) redirect("/choix-commerce");
  await writeSession(user.id, merchantId);
  revalidatePath("/", "layout");
  redirect("/app");
}

export async function forgotPasswordAction(email: string): Promise<ActionResult<{ demoLink: string | null }>> {
  try {
    const token = await requestPasswordReset(getRepos(), String(email));
    // Hors démo, le lien serait envoyé par email ; il n'est jamais renvoyé au navigateur.
    return { ok: true, data: { demoLink: env.demoMode && token ? `/mot-de-passe-oublie?token=${token}` : null } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function resetPasswordAction(token: string, password: string): Promise<ActionResult<null>> {
  try {
    await resetPassword(getRepos(), String(token), String(password));
    return { ok: true, data: null, message: "Mot de passe modifié. Vous pouvez vous connecter." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function completeOnboardingAction(input: OnboardingInput): Promise<ActionResult<{ slug: string; merchantId: string }>> {
  try {
    const s = await readSession();
    if (!s) throw new AppError("UNAUTHENTICATED", "Session expirée. Reconnectez-vous.");
    const repos = getRepos();
    const user = await repos.users.findById(s.uid);
    if (!user) throw new AppError("UNAUTHENTICATED", "Compte introuvable.");
    const merchant = await createMerchantFromOnboarding(repos, user, input);
    await writeSession(user.id, merchant.id);
    revalidatePath("/", "layout");
    return { ok: true, data: { slug: merchant.slug, merchantId: merchant.id } };
  } catch (e) {
    return toActionError(e);
  }
}
