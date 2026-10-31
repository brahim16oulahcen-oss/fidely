import "server-only";
import { randomInt } from "crypto";
import { z } from "zod";
import type { Repositories } from "@/lib/db/repository";
import { AppError } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { newId, newSecretToken } from "@/lib/utils/ids";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { rateLimit } from "@/lib/security/rate-limit";
import type { User } from "@/types/domain";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(60),
  email: z.string().trim().toLowerCase().email("Adresse email invalide").max(120),
  password: z
    .string()
    .min(8, "8 caractères minimum")
    .max(100)
    .regex(/[A-Za-z]/, "Au moins une lettre")
    .regex(/\d/, "Au moins un chiffre"),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter les conditions d'utilisation" }) }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export async function registerOwner(repos: Repositories, raw: z.input<typeof signupSchema>) {
  const input = signupSchema.parse(raw);
  if (await repos.users.findOne({ email: input.email })) throw new AppError("CONFLICT", "Un compte existe déjà avec cette adresse email.");
  const user: User = {
    id: newId("usr"),
    email: input.email,
    name: input.name,
    passwordHash: hashPassword(input.password),
    isPlatformAdmin: false,
    memberships: [],
    emailVerified: false,
    verificationCode: String(randomInt(100000, 1000000)),
    createdAt: new Date().toISOString(),
  };
  await repos.users.insert(user);
  await audit(repos, { actorUserId: user.id, actorLabel: user.name, merchantId: null, action: "user.registered", target: user.email });
  return user;
}

export async function verifyEmail(repos: Repositories, userId: string, code: string) {
  const user = await repos.users.findById(userId);
  if (!user) throw new AppError("NOT_FOUND", "Compte introuvable.");
  if (user.emailVerified) return user;
  if (!rateLimit(`verify:${userId}`, 8, 10 * 60_000)) throw new AppError("RATE_LIMIT", "Trop de tentatives. Réessayez dans quelques minutes.");
  if (!user.verificationCode || code.trim() !== user.verificationCode) throw new AppError("VALIDATION", "Code incorrect.");
  return repos.users.update(userId, { emailVerified: true, verificationCode: undefined });
}

export async function authenticate(repos: Repositories, raw: z.input<typeof loginSchema>, ip = "local") {
  const input = loginSchema.parse(raw);
  if (!rateLimit(`login:${ip}:${input.email}`, 10, 15 * 60_000))
    throw new AppError("RATE_LIMIT", "Trop de tentatives de connexion. Réessayez dans 15 minutes.");
  const user = await repos.users.findOne({ email: input.email });
  // Message identique que l'email existe ou non (pas d'énumération de comptes).
  if (!user || !verifyPassword(input.password, user.passwordHash)) throw new AppError("UNAUTHENTICATED", "Email ou mot de passe incorrect.");
  await repos.users.update(user.id, { lastLoginAt: new Date().toISOString() });
  return user;
}

export async function requestPasswordReset(repos: Repositories, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!rateLimit(`reset:${normalized}`, 5, 60 * 60_000)) throw new AppError("RATE_LIMIT", "Trop de demandes. Réessayez plus tard.");
  const user = await repos.users.findOne({ email: normalized });
  if (!user) return null;
  const token = newSecretToken();
  await repos.users.update(user.id, { resetToken: `${token}.${Date.now() + 30 * 60_000}` });
  return token;
}

export async function resetPassword(repos: Repositories, token: string, password: string) {
  const parsed = signupSchema.shape.password.parse(password);
  const users = await repos.users.findMany();
  const user = users.find((u) => u.resetToken?.startsWith(`${token}.`));
  const exp = Number(user?.resetToken?.split(".").pop());
  if (!user || !exp || exp < Date.now()) throw new AppError("VALIDATION", "Lien invalide ou expiré.");
  await repos.users.update(user.id, { passwordHash: hashPassword(parsed), resetToken: undefined });
  await audit(repos, { actorUserId: user.id, actorLabel: user.name, merchantId: null, action: "user.password_reset", target: user.email });
  return user;
}

export { newId };
