import "server-only";
import { redirect } from "next/navigation";
import { getRepos } from "@/lib/db";
import { readSession } from "./session";
import { AppError, assertCan, type MerchantActor, type Permission } from "./permissions";
import type { Merchant, User } from "@/types/domain";

export interface MerchantContext {
  actor: MerchantActor;
  merchant: Merchant;
  user: User;
}

export async function getCurrentUser(): Promise<User | null> {
  const s = await readSession();
  if (!s) return null;
  return getRepos().users.findById(s.uid);
}

/** Résout le commerce actif et le rôle de l'utilisateur, ou lève une erreur. */
export async function getMerchantContext(perm?: Permission): Promise<MerchantContext> {
  const s = await readSession();
  if (!s) throw new AppError("UNAUTHENTICATED", "Session expirée. Veuillez vous reconnecter.");
  const repos = getRepos();
  const user = await repos.users.findById(s.uid);
  if (!user) throw new AppError("UNAUTHENTICATED", "Utilisateur introuvable.");
  const membership = user.memberships.find((m) => m.merchantId === s.mid) ?? user.memberships[0];
  if (!membership) throw new AppError("FORBIDDEN", "Aucun commerce associé à ce compte.");
  const merchant = await repos.merchants.findById(membership.merchantId);
  if (!merchant) throw new AppError("NOT_FOUND", "Commerce introuvable.");
  const actor: MerchantActor = {
    userId: user.id,
    name: user.name,
    email: user.email,
    isPlatformAdmin: user.isPlatformAdmin,
    merchantId: merchant.id,
    role: membership.role,
  };
  if (perm) assertCan(actor, perm);
  return { actor, merchant, user };
}

/** Variante pour les pages : redirige au lieu de lever une erreur. */
export async function requireMerchantPage(perm?: Permission): Promise<MerchantContext> {
  const s = await readSession();
  if (!s) redirect("/connexion");
  const user = await getRepos().users.findById(s.uid);
  if (!user) redirect("/connexion");
  if (user.memberships.length === 0) redirect(user.isPlatformAdmin ? "/admin" : "/onboarding");
  try {
    return await getMerchantContext(perm);
  } catch (e) {
    if (e instanceof AppError && e.code === "FORBIDDEN") redirect("/app/scanner?interdit=1");
    throw e;
  }
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Veuillez vous connecter.");
  if (!user.isPlatformAdmin) throw new AppError("FORBIDDEN", "Accès réservé aux administrateurs Fidely.");
  return user;
}

export async function requireAdminPage(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/admin");
  if (!user.isPlatformAdmin) redirect("/app?interdit=1");
  return user;
}
