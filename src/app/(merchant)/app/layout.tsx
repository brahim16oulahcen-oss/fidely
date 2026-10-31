import Link from "next/link";
import { requireMerchantPage } from "@/lib/auth/context";
import { AppShell, type ShellData } from "@/components/layout/app-shell";
import { getRepos } from "@/lib/db";
import { getPlan } from "@/config/plans";
import { ROLE_LABEL, ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { env } from "@/config/env";
import { DAY_MS } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const { actor, merchant, user } = await requireMerchantPage();
  const repos = getRepos();
  const memberMerchants = await Promise.all(user.memberships.map((m) => repos.merchants.findById(m.merchantId)));
  const sub = await repos.subscriptions.findById(merchant.id);
  const data: ShellData = {
    user: { name: user.name, email: user.email, roleLabel: ROLE_LABEL[actor.role] },
    merchant: {
      id: merchant.id,
      name: merchant.name,
      slug: merchant.slug,
      icon: merchant.logo.icon,
      imageDataUrl: merchant.logo.imageDataUrl,
      colors: merchant.colors,
      planName: getPlan(merchant.planId).name,
      status: merchant.status,
    },
    memberships: user.memberships.map((m, i) => ({ id: m.merchantId, name: memberMerchants[i]?.name ?? "—", roleLabel: ROLE_LABEL[m.role] })),
    permissions: ROLE_PERMISSIONS[actor.role],
    demo: env.demoMode,
  };

  let banner: React.ReactNode = null;
  if (merchant.status === "suspended") {
    banner = (
      <div role="alert" className="border-b border-danger/30 bg-danger-soft px-4 py-2.5 text-center text-sm text-danger-fg md:px-8">
        <strong>Compte suspendu</strong> — {merchant.suspendedReason ?? "contactez le support"}. Les opérations de fidélité et les inscriptions sont bloquées.{" "}
        <Link href="/app/support" className="font-medium underline">Contacter le support</Link>
      </div>
    );
  } else if (merchant.status === "trial" && sub) {
    const days = Math.max(0, Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / DAY_MS));
    banner = (
      <div className="border-b border-primary/15 bg-primary-soft px-4 py-2 text-center text-sm md:px-8">
        Essai gratuit de l&apos;offre {getPlan(merchant.planId).name} : <strong>{days} jour{days > 1 ? "s" : ""} restant{days > 1 ? "s" : ""}</strong>.{" "}
        {actor.role === "owner" && <Link href="/app/abonnement" className="font-medium text-primary underline-offset-2 hover:underline">Choisir une offre</Link>}
      </div>
    );
  }

  return (
    <AppShell data={data} banner={banner}>
      {children}
    </AppShell>
  );
}
