import { FidelyLogo } from "@/components/loyalty/fidely-logo";
import { brand } from "@/config/brand";
import { LoyaltyCardVisual } from "@/components/wallet/loyalty-card-visual";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_520px] xl:grid-cols-[1fr_600px]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <FidelyLogo />
        <div className="flex flex-1 items-center justify-center py-10">{children}</div>
        <p className="text-center text-xs text-muted">© {new Date().getFullYear()} {brand.legalName}</p>
      </div>
      <aside className="relative hidden overflow-hidden bg-[#0b0f19] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <p className="relative text-sm font-medium text-indigo-300">{brand.tagline}</p>
        <div className="relative mx-auto w-full max-w-sm rotate-[-4deg]">
          <LoyaltyCardVisual
            merchantName="Café Rouen Centre"
            logo={{ icon: "Coffee" }}
            design={{ title: "Carte Café", background: "#3B2416", text: "#FFF7ED", accent: "#F59E0B", showLogo: true, rewardText: "1 café offert", terms: "" }}
            rules={{ type: "stamps", stampsRequired: 10, stampsPerVisit: 1, rewardName: "1 café offert", rewardValidityDays: 60 }}
            balances={{ stamps: 7, points: 0, lifetimePoints: 0, cashbackCents: 0, tier: "bronze" }}
            customerName="Léa Martin"
            nextRewardLabel="3 passages avant : 1 café offert"
            progressRatio={0.7}
          />
        </div>
        <div className="relative">
          <p className="text-2xl font-semibold leading-snug tracking-tight">« Nos habitués ont enfin une carte qu&apos;ils ne perdent plus. Et je vois qui revient. »</p>
          <p className="mt-3 text-sm text-slate-400">Témoignage fictif — démonstration</p>
        </div>
      </aside>
    </div>
  );
}
