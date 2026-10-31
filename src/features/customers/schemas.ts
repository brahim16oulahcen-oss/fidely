import { z } from "zod";

export const enrollSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(40),
  lastName: z.string().trim().max(60).default(""),
  email: z.string().trim().toLowerCase().email("Adresse email invalide").max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^[0-9+ .()-]{8,20}$/.test(v), "Numéro de téléphone invalide")
    .default(""),
  birthday: z
    .string()
    .trim()
    .refine((v) => v === "" || /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(v), "Format attendu : MM-JJ")
    .default(""),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter les conditions du programme" }) }),
  consentEmail: z.boolean().default(false),
  consentSms: z.boolean().default(false),
});
export type EnrollInput = z.input<typeof enrollSchema>;

export const consentSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  wallet: z.boolean(),
});

export const customerFilterSchema = z.object({
  q: z.string().optional(),
  segment: z.enum(["all", "new", "active", "loyal", "vip", "inactive"]).default("all"),
  sort: z.enum(["createdAt", "lastVisitAt", "visits", "points", "name"]).default("lastVisitAt"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  consent: z.enum(["any", "email", "sms", "none"]).default("any"),
});
export type CustomerFilter = z.infer<typeof customerFilterSchema>;
