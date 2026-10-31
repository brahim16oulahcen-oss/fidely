import { ZodError } from "zod";
import { AppError } from "@/lib/auth/permissions";
import { LoyaltyError } from "@/features/loyalty/engine";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string> };

export function toActionError(e: unknown): { ok: false; error: string; code?: string; fieldErrors?: Record<string, string> } {
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of e.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: e.issues[0]?.message ?? "Données invalides.", code: "VALIDATION", fieldErrors };
  }
  if (e instanceof AppError || e instanceof LoyaltyError) return { ok: false, error: e.message, code: e.code };
  // Ne jamais exposer le détail d'une erreur inattendue au client.
  if (e && typeof e === "object" && "digest" in e) throw e; // redirect()/notFound() de Next.js
  console.error("[fidely] erreur inattendue", e);
  return { ok: false, error: "Une erreur inattendue est survenue. Réessayez.", code: "INTERNAL" };
}
