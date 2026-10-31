"use server";
import { cookies, headers } from "next/headers";
import { getRepos } from "@/lib/db";
import { publicAction } from "./_helpers";
import { deleteMyAccount, enrollCustomer, findCardsForRecovery, updatePreferencesByToken } from "@/features/customers/service";
import type { EnrollInput } from "@/features/customers/schemas";
import { AppError } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/security/rate-limit";
import { env } from "@/config/env";

async function clientIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
}

export async function enrollAction(slug: string, input: EnrollInput, source: "qr" | "web") {
  return publicAction(async () => {
    if (!rateLimit(`enroll:${await clientIp()}`, 20, 10 * 60_000)) throw new AppError("RATE_LIMIT", "Trop d'inscriptions depuis cet appareil. Réessayez plus tard.");
    const repos = getRepos();
    const merchant = await repos.merchants.findOne({ slug: String(slug) });
    if (!merchant) throw new AppError("NOT_FOUND", "Commerce introuvable.");
    const { card } = await enrollCustomer(repos, merchant, input, source === "qr" ? "qr" : "web");
    (await cookies()).set("fidely_card", card.token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return { token: card.token };
  });
}

export async function updatePreferencesAction(token: string, consent: { email: boolean; sms: boolean; wallet: boolean }) {
  return publicAction(() => updatePreferencesByToken(getRepos(), String(token), consent), "Préférences enregistrées.");
}

export async function deleteAccountAction(token: string) {
  return publicAction(async () => {
    await deleteMyAccount(getRepos(), String(token));
    (await cookies()).delete("fidely_card");
    return true;
  });
}

/**
 * Récupération de carte par email. Réponse identique que l'email existe ou non.
 * En mode démo uniquement, les liens sont affichés dans une « boîte mail simulée ».
 */
export async function recoverCardAction(email: string) {
  return publicAction(async () => {
    if (!rateLimit(`recover:${await clientIp()}`, 10, 10 * 60_000)) throw new AppError("RATE_LIMIT", "Trop de demandes. Réessayez plus tard.");
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    if (!valid) throw new AppError("VALIDATION", "Adresse email invalide.");
    const cards = await findCardsForRecovery(getRepos(), String(email));
    return { demoOutbox: env.demoMode ? cards.map((c) => ({ merchantName: c.merchantName, url: `/carte/${c.token}` })) : null };
  });
}
