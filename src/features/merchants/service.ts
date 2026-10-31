import "server-only";
import { z } from "zod";
import type { Repositories } from "@/lib/db/repository";
import { AppError, assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { newId, slugify } from "@/lib/utils/ids";
import { DAY_MS } from "@/lib/utils/dates";
import { hashPassword } from "@/lib/security/password";
import type { AutomationTrigger, Merchant, Program, ProgramRules, Reward, User } from "@/types/domain";
import { cardDesignSchema, rulesSchema } from "@/features/loyalty/schemas";
import { getPlan } from "@/config/plans";
import type { MerchantCtx } from "@/features/loyalty/programs";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const onboardingSchema = z.object({
  business: z.object({
    name: z.string().trim().min(2, "Nom du commerce requis").max(60),
    category: z.enum(["cafe", "barber", "bakery", "beauty", "restaurant", "florist", "bookshop", "other"]),
    address: z.string().trim().min(3, "Adresse requise").max(120),
    postalCode: z.string().trim().regex(/^\d{5}$/, "Code postal à 5 chiffres"),
    city: z.string().trim().min(2).max(60),
    phone: z.string().trim().max(20).default(""),
    description: z.string().trim().max(160).default(""),
  }),
  branding: z.object({
    icon: z.string().min(2).max(30),
    imageDataUrl: z
      .string()
      .max(300_000, "Logo trop volumineux (200 Ko maximum)")
      .refine((v) => v === "" || /^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(v), "Format d'image non supporté")
      .optional(),
    primary: hex,
    text: hex,
    accent: hex,
  }),
  program: z.object({ name: z.string().trim().min(2).max(50), rules: rulesSchema }),
  rewards: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(60),
        description: z.string().trim().max(200).default(""),
        cost: z.coerce.number().int().min(0).max(100000),
        validityDays: z.coerce.number().int().min(1).max(730),
      }),
    )
    .max(6)
    .default([]),
  card: cardDesignSchema,
});
export type OnboardingInput = z.input<typeof onboardingSchema>;

async function uniqueSlug(repos: Repositories, name: string) {
  const base = slugify(name) || "commerce";
  let slug = base;
  let n = 2;
  while (await repos.merchants.findOne({ slug })) slug = `${base}-${n++}`;
  return slug;
}

const AUTOMATION_DEFAULTS: Record<AutomationTrigger, string> = {
  inactive_30: "Bonjour {prenom}, cela fait un moment ! Passez nous voir, votre carte {commerce} vous attend.",
  birthday: "Joyeux anniversaire {prenom} ! Un cadeau vous attend chez {commerce}.",
  reward_available: "Bonne nouvelle {prenom} : votre récompense est disponible chez {commerce}.",
  new_member: "Bienvenue {prenom} ! Votre carte {commerce} est prête.",
  special_offer: "{prenom}, profitez de notre offre spéciale cette semaine chez {commerce}.",
};

/**
 * Création d'un commerce à la fin de l'onboarding : commerce, établissement,
 * programme, récompenses, abonnement d'essai (Pro, 14 jours, sans paiement).
 */
export async function createMerchantFromOnboarding(repos: Repositories, user: User, raw: OnboardingInput) {
  const input = onboardingSchema.parse(raw);
  if (!user.emailVerified) throw new AppError("FORBIDDEN", "Vérifiez votre adresse email avant de créer un commerce.");
  const trialPlan = getPlan("pro");
  if (!trialPlan.programTypes.includes(input.program.rules.type) && input.program.rules.type !== "tiers") {
    throw new AppError("VALIDATION", "Type de programme non disponible.");
  }
  return repos.tx(async () => {
    const now = new Date();
    const merchantId = newId("mer");
    const programId = newId("prg");
    const rules = input.program.rules as ProgramRules;
    // Les niveaux VIP nécessitent l'offre Business : l'essai démarre alors sur Business.
    const planId = rules.type === "tiers" ? "business" : "pro";
    const merchant: Merchant = {
      id: merchantId,
      slug: await uniqueSlug(repos, input.business.name),
      name: input.business.name,
      category: input.business.category,
      description: input.business.description,
      address: input.business.address,
      postalCode: input.business.postalCode,
      city: input.business.city,
      phone: input.business.phone,
      email: user.email,
      logo: { icon: input.branding.icon, imageDataUrl: input.branding.imageDataUrl || undefined },
      colors: { primary: input.branding.primary, text: input.branding.text, accent: input.branding.accent },
      planId,
      status: "trial",
      primaryProgramId: programId,
      onboardingCompleted: true,
      settings: { minSecondsBetweenVisits: 60, maxAmountCents: 100000, retentionMonths: 36, attributionRate: 0.2 },
      createdAt: now.toISOString(),
      isDemoSeed: false,
    };
    await repos.merchants.insert(merchant);
    await repos.stores.insert({ id: newId("sto"), merchantId, name: merchant.name, address: `${merchant.address}, ${merchant.postalCode} ${merchant.city}`, createdAt: now.toISOString() });
    const program: Program = {
      id: programId,
      merchantId,
      name: input.program.name,
      type: rules.type,
      status: "active",
      rules,
      ruleVersion: 1,
      card: input.card,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await repos.programs.insert(program);
    const rewards: Reward[] = [];
    if (rules.type === "stamps") {
      rewards.push({
        id: newId("rwd"),
        merchantId,
        programId,
        name: rules.rewardName.replace(/^1 /, "").replace(/^./, (c) => c.toUpperCase()),
        description: `Débloquée automatiquement après ${rules.stampsRequired} passages.`,
        cost: rules.stampsRequired,
        validityDays: rules.rewardValidityDays,
        quantity: null,
        issuedCount: 0,
        active: true,
        autoUnlock: true,
        createdAt: now.toISOString(),
      });
    }
    for (const r of input.rewards) {
      rewards.push({
        id: newId("rwd"),
        merchantId,
        programId,
        name: r.name,
        description: r.description,
        cost: rules.type === "cashback" ? 0 : r.cost,
        validityDays: r.validityDays,
        quantity: null,
        issuedCount: 0,
        active: true,
        autoUnlock: false,
        createdAt: now.toISOString(),
      });
    }
    for (const r of rewards) await repos.rewards.insert(r);
    for (const trigger of Object.keys(AUTOMATION_DEFAULTS) as AutomationTrigger[]) {
      await repos.automations.insert({ id: newId("aut"), merchantId, trigger, enabled: trigger === "new_member", channel: "email", message: AUTOMATION_DEFAULTS[trigger] });
    }
    await repos.subscriptions.insert({
      merchantId,
      planId,
      status: "trialing",
      startedAt: now.toISOString(),
      currentPeriodEnd: new Date(now.getTime() + 14 * DAY_MS).toISOString(),
      provider: "demo",
    });
    await repos.users.update(user.id, { memberships: [...user.memberships, { merchantId, role: "owner" }] });
    await audit(repos, { actorUserId: user.id, actorLabel: user.name, merchantId, action: "merchant.created", target: merchant.name, metadata: { program: rules.type, plan: planId } });
    return merchant;
  });
}

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(160),
  address: z.string().trim().min(3).max(120),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Code postal à 5 chiffres"),
  city: z.string().trim().min(2).max(60),
  phone: z.string().trim().max(20),
  email: z.string().trim().email("Email invalide"),
  siret: z.string().trim().regex(/^(\d{14})?$/, "SIRET à 14 chiffres").optional(),
  minSecondsBetweenVisits: z.coerce.number().int().min(0).max(86400),
  maxAmountCents: z.coerce.number().int().min(1000).max(10_000_000),
  retentionMonths: z.coerce.number().int().min(6).max(60),
  attributionRate: z.coerce.number().min(0).max(1),
});

export async function updateSettings(ctx: MerchantCtx, raw: unknown) {
  assertCan(ctx.actor, "settings.manage");
  const s = settingsSchema.parse(raw);
  await ctx.repos.merchants.update(ctx.merchant.id, {
    name: s.name,
    description: s.description,
    address: s.address,
    postalCode: s.postalCode,
    city: s.city,
    phone: s.phone,
    email: s.email,
    siret: s.siret || undefined,
    settings: { minSecondsBetweenVisits: s.minSecondsBetweenVisits, maxAmountCents: s.maxAmountCents, retentionMonths: s.retentionMonths, attributionRate: s.attributionRate },
  });
  await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "merchant.settings_updated", target: s.name });
}

export const brandingSchema = z.object({ icon: z.string().min(2).max(30), primary: hex, text: hex, accent: hex });
export async function updateBranding(ctx: MerchantCtx, raw: unknown) {
  assertCan(ctx.actor, "settings.manage");
  const b = brandingSchema.parse(raw);
  await ctx.repos.merchants.update(ctx.merchant.id, { logo: { ...ctx.merchant.logo, icon: b.icon }, colors: { primary: b.primary, text: b.text, accent: b.accent } });
}

// ── Équipe ─────────────────────────────────────────────────────

export const inviteSchema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(60),
  email: z.string().trim().toLowerCase().email("Email invalide"),
  role: z.enum(["manager", "staff"]),
});

export async function listTeam(ctx: MerchantCtx) {
  const users = await ctx.repos.users.findMany();
  return users
    .filter((u) => u.memberships.some((m) => m.merchantId === ctx.merchant.id))
    .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.memberships.find((m) => m.merchantId === ctx.merchant.id)!.role, lastLoginAt: u.lastLoginAt ?? null, createdAt: u.createdAt }));
}

export async function inviteMember(ctx: MerchantCtx, raw: unknown) {
  assertCan(ctx.actor, "team.manage");
  const input = inviteSchema.parse(raw);
  const plan = getPlan(ctx.merchant.planId);
  const team = await listTeam(ctx);
  if (team.filter((m) => m.role !== "owner").length >= plan.limits.staff)
    throw new AppError("LIMIT", `Votre offre ${plan.name} permet ${plan.limits.staff} employé(s). Passez à une offre supérieure.`);
  return ctx.repos.tx(async () => {
    let user = await ctx.repos.users.findOne({ email: input.email });
    if (user?.memberships.some((m) => m.merchantId === ctx.merchant.id)) throw new AppError("CONFLICT", "Cette personne fait déjà partie de l'équipe.");
    if (user?.isPlatformAdmin) throw new AppError("FORBIDDEN", "Ce compte ne peut pas être ajouté à une équipe.");
    if (user) {
      user = await ctx.repos.users.update(user.id, { memberships: [...user.memberships, { merchantId: ctx.merchant.id, role: input.role }] });
    } else {
      user = {
        id: newId("usr"),
        email: input.email,
        name: input.name,
        // Démo : mot de passe initial connu. Production : lien d'invitation à usage unique.
        passwordHash: hashPassword("demo1234"),
        isPlatformAdmin: false,
        memberships: [{ merchantId: ctx.merchant.id, role: input.role }],
        emailVerified: true,
        createdAt: new Date().toISOString(),
      };
      await ctx.repos.users.insert(user);
    }
    await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "team.member_invited", target: input.email, metadata: { role: input.role } });
    return user;
  });
}

export async function changeMemberRole(ctx: MerchantCtx, userId: string, role: "manager" | "staff") {
  assertCan(ctx.actor, "team.manage");
  const user = await ctx.repos.users.findById(userId);
  const m = user?.memberships.find((x) => x.merchantId === ctx.merchant.id);
  if (!user || !m) throw new AppError("NOT_FOUND", "Membre introuvable.");
  if (m.role === "owner") throw new AppError("FORBIDDEN", "Le rôle du propriétaire ne peut pas être modifié.");
  await ctx.repos.users.update(userId, { memberships: user.memberships.map((x) => (x.merchantId === ctx.merchant.id ? { ...x, role } : x)) });
  await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "team.role_changed", target: user.email, metadata: { role } });
}

export async function removeMember(ctx: MerchantCtx, userId: string) {
  assertCan(ctx.actor, "team.manage");
  const user = await ctx.repos.users.findById(userId);
  const m = user?.memberships.find((x) => x.merchantId === ctx.merchant.id);
  if (!user || !m) throw new AppError("NOT_FOUND", "Membre introuvable.");
  if (m.role === "owner") throw new AppError("FORBIDDEN", "Le propriétaire ne peut pas être retiré.");
  await ctx.repos.users.update(userId, { memberships: user.memberships.filter((x) => x.merchantId !== ctx.merchant.id) });
  await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "team.member_removed", target: user.email });
}

export async function addStore(ctx: MerchantCtx, raw: unknown) {
  assertCan(ctx.actor, "settings.manage");
  const input = z.object({ name: z.string().trim().min(2).max(60), address: z.string().trim().min(3).max(120) }).parse(raw);
  const plan = getPlan(ctx.merchant.planId);
  const count = await ctx.repos.stores.count({ merchantId: ctx.merchant.id });
  if (count >= plan.limits.stores) throw new AppError("LIMIT", `Votre offre ${plan.name} permet ${plan.limits.stores} établissement(s). L'offre Business permet jusqu'à 10 établissements.`);
  await ctx.repos.stores.insert({ id: newId("sto"), merchantId: ctx.merchant.id, name: input.name, address: input.address, createdAt: new Date().toISOString() });
  await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "store.created", target: input.name });
}
