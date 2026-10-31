import { PricingCards, PricingComparison } from "@/components/marketing/pricing-cards";
import { Faq } from "@/components/marketing/faq";

export const metadata = { title: "Tarifs" };

export default function PricingPage() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl space-y-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Des tarifs simples pour chaque commerce</h1>
          <p className="mt-4 text-lg text-muted">14 jours d&apos;essai gratuit, sans carte bancaire et sans engagement. Prix hors taxes, facturation mensuelle.</p>
        </div>
        <PricingCards />
        <div>
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">Comparer les offres</h2>
          <PricingComparison />
          <p className="mt-4 text-sm text-muted">Au-delà du nombre de clients inclus, l&apos;inscription de nouveaux clients est suspendue jusqu&apos;au passage à l&apos;offre supérieure ; les clients existants continuent d&apos;utiliser leur carte.</p>
        </div>
        <div className="max-w-3xl"><h2 className="mb-6 text-2xl font-semibold tracking-tight">Questions fréquentes</h2><Faq /></div>
      </div>
    </div>
  );
}
