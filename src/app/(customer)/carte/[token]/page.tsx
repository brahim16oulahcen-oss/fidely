import { notFound } from "next/navigation";
import Link from "next/link";
import { getRepos } from "@/lib/db";
import { getCardByToken } from "@/features/customers/service";
import { CustomerCardView } from "@/components/customer/customer-card-view";
import { MerchantLogo } from "@/components/loyalty/merchant-logo";
import { walletProviders } from "@/lib/wallet";
import { env } from "@/config/env";
import { brand } from "@/config/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ma carte de fidélité", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function CardPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ bienvenue?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const data = await getCardByToken(getRepos(), token);
  if (!data) notFound();
  const { snapshot, merchant, customer } = data;
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <MerchantLogo icon={merchant.logo.icon} imageDataUrl={merchant.logo.imageDataUrl} background={merchant.colors.primary} color={merchant.colors.text} name={merchant.name} className="size-9 rounded-lg" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{merchant.name}</p><p className="truncate text-xs text-muted">Bonjour {customer.firstName}</p></div>
        <Link href="/" className="text-xs text-muted">{brand.name}</Link>
      </header>
      <CustomerCardView
        token={token}
        snapshot={snapshot}
        merchant={{ name: merchant.name, logo: merchant.logo, address: `${merchant.address}, ${merchant.postalCode} ${merchant.city}`, email: merchant.email }}
        consent={{ email: customer.consent.email, sms: customer.consent.sms, wallet: customer.consent.wallet }}
        wallet={(["apple", "google"] as const).map((id) => ({ id, label: walletProviders[id].label, configured: walletProviders[id].isConfigured(), missing: walletProviders[id].missingConfiguration() }))}
        welcome={sp.bienvenue === "1"}
        demo={env.demoMode}
      />
    </div>
  );
}
