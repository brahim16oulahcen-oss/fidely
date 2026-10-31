import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale attendue (#RRGGBB)");

export const stampsRulesSchema = z.object({
  type: z.literal("stamps"),
  stampsRequired: z.coerce.number().int().min(2, "Minimum 2 tampons").max(30, "Maximum 30 tampons"),
  stampsPerVisit: z.coerce.number().int().min(1).max(5),
  rewardName: z.string().trim().min(2, "Nom de récompense requis").max(60),
  rewardValidityDays: z.coerce.number().int().min(7).max(365),
});
export const pointsRulesSchema = z.object({
  type: z.literal("points"),
  pointsPerEuro: z.coerce.number().int().min(1).max(100),
  welcomePoints: z.coerce.number().int().min(0).max(1000),
});
export const cashbackRulesSchema = z.object({
  type: z.literal("cashback"),
  percent: z.coerce.number().min(0.5).max(20),
  minPurchaseCents: z.coerce.number().int().min(0).max(100000),
  maxCreditPerTxCents: z.coerce.number().int().min(100).max(100000),
});
export const tiersRulesSchema = z
  .object({
    type: z.literal("tiers"),
    pointsPerEuro: z.coerce.number().int().min(1).max(100),
    silverThreshold: z.coerce.number().int().min(10),
    goldThreshold: z.coerce.number().int().min(20),
    multipliers: z.object({ bronze: z.coerce.number().min(1).max(5), silver: z.coerce.number().min(1).max(5), gold: z.coerce.number().min(1).max(5) }),
    benefits: z.object({ bronze: z.string().max(80), silver: z.string().max(80), gold: z.string().max(80) }),
  })
  .refine((r) => r.goldThreshold > r.silverThreshold, { message: "Le seuil Gold doit dépasser le seuil Silver", path: ["goldThreshold"] });

export const rulesSchema = z.union([stampsRulesSchema, pointsRulesSchema, cashbackRulesSchema, tiersRulesSchema]);

export const cardDesignSchema = z.object({
  title: z.string().trim().min(2).max(40),
  background: hex,
  text: hex,
  accent: hex,
  showLogo: z.boolean(),
  rewardText: z.string().trim().max(60),
  terms: z.string().trim().max(400),
});

export const programInputSchema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(50),
  rules: rulesSchema,
});

export const amountSchema = z.coerce
  .number({ invalid_type_error: "Montant invalide" })
  .positive("Le montant doit être positif")
  .max(10000, "Montant trop élevé")
  .transform((v) => Math.round(v * 100));

export const idempotencyKeySchema = z.string().min(8).max(80);

export const earnInputSchema = z.object({
  cardId: z.string().min(3),
  amountCents: z.number().int().positive().max(1_000_000).nullable(),
  storeId: z.string().optional(),
  idempotencyKey: idempotencyKeySchema,
  override: z.boolean().optional(),
});

export const rewardInputSchema = z.object({
  programId: z.string().min(3),
  name: z.string().trim().min(2, "Nom requis").max(60),
  description: z.string().trim().max(200).default(""),
  cost: z.coerce.number().int().min(0, "Coût positif").max(100000),
  validityDays: z.coerce.number().int().min(1).max(730),
  quantity: z.coerce.number().int().min(1).max(100000).nullable(),
  active: z.boolean(),
  autoUnlock: z.boolean(),
});
