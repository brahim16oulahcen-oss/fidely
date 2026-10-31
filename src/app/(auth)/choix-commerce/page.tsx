import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { switchMerchantAction } from "@/app/actions/auth";
import { MerchantLogo } from "@/components/loyalty/merchant-logo";
import { ROLE_LABEL } from "@/lib/auth/permissions";
import { PLANS } from "@/config/plans";

export const metadata = { title: "Choisir un commerce" };
export const dynamic = "force-dynamic";

export default async function ChooseMerchantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (user.memberships.length === 0) redirect("/onboarding");
  const merchants = await Promise.all(user.memberships.map(async (m) => ({ m, merchant: await getRepos().merchants.findById(m.merchantId) })));
  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Choisissez un commerce</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Bonjour {user.name.split(" ")[0]}, vous avez accès à plusieurs commerces.</p>
      <ul className="space-y-2">
        {merchants.map(({ m, merchant }) => merchant && (
          <li key={merchant.id}>
            <form action={switchMerchantAction.bind(null, merchant.id)}>
              <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left shadow-xs hover:border-primary/40 hover:bg-primary-soft/40" data-testid="choose-merchant">
                <MerchantLogo icon={merchant.logo.icon} imageDataUrl={merchant.logo.imageDataUrl} background={merchant.colors.primary} color={merchant.colors.text} name={merchant.name} />
                <span className="flex-1"><span className="block font-medium">{merchant.name}</span><span className="text-xs text-muted">{ROLE_LABEL[m.role]} · Offre {PLANS[merchant.planId].name}</span></span>
              </button>
            </form>
          </li>
        ))}
      </ul>
      <Link href="/onboarding?nouveau=1" className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted hover:text-foreground"><Plus className="size-4" /> Créer un nouveau commerce</Link>
    </div>
  );
}
