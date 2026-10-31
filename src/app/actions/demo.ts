"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { resolveDemoProfile, resetDemo, type DemoRole } from "@/lib/demo/service";
import { writeSession, clearSession } from "@/lib/auth/session";
import { toActionError } from "@/lib/action-result";

export async function switchDemoRoleAction(role: DemoRole) {
  let target = "/";
  try {
    const profile = await resolveDemoProfile(role);
    if (profile.kind === "customer") {
      await clearSession();
      (await cookies()).set("fidely_card", profile.token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
      target = `/carte/${profile.token}`;
    } else {
      const u = profile.user;
      await writeSession(u.id, u.memberships.find((m) => m.merchantId === "mer_cafe")?.merchantId ?? u.memberships[0]?.merchantId ?? null);
      target = u.isPlatformAdmin ? "/admin" : role === "staff" ? "/app/scanner" : "/app";
    }
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/", "layout");
  redirect(target);
}

export async function resetDemoAction() {
  try {
    resetDemo();
  } catch (e) {
    return toActionError(e);
  }
  await clearSession();
  (await cookies()).delete("fidely_card");
  revalidatePath("/", "layout");
  redirect("/demo?reinitialise=1");
}
