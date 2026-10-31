import "server-only";
import { revalidatePath } from "next/cache";
import { getRepos } from "@/lib/db";
import { getMerchantContext } from "@/lib/auth/context";
import type { Permission } from "@/lib/auth/permissions";
import { toActionError, type ActionResult } from "@/lib/action-result";
import type { MerchantCtx } from "@/features/loyalty/programs";

/** Exécute une action commerçant : session + rôle vérifiés côté serveur, erreurs normalisées. */
export async function merchantAction<T>(perm: Permission | undefined, fn: (ctx: MerchantCtx) => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const { actor, merchant } = await getMerchantContext(perm);
    const data = await fn({ repos: getRepos(), actor, merchant });
    revalidatePath("/", "layout");
    return { ok: true, data, message };
  } catch (e) {
    return toActionError(e);
  }
}

export async function publicAction<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    revalidatePath("/", "layout");
    return { ok: true, data, message };
  } catch (e) {
    return toActionError(e);
  }
}
