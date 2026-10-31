import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { requireMerchantPage } from "@/lib/auth/context";
import { getPlan } from "@/config/plans";
import { SEGMENTS } from "@/features/customers/segments";
import { PageHeader } from "@/components/layout/page-header";
import { CampaignWizard } from "@/components/campaigns/campaign-wizard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { SegmentId } from "@/types/domain";

export const metadata = { title: "Nouvelle campagne" };

export default async function NewCampaignPage() {
  const { merchant } = await requireMerchantPage("campaigns.manage");
  const plan = getPlan(merchant.planId);
  if (!plan.features.campaigns) return <EmptyState icon={Lock} title={`Non inclus dans l'offre ${plan.name}`} description="Les campagnes sont disponibles à partir de l'offre Pro." action={<Button asChild><Link href="/app/abonnement">Voir les offres</Link></Button>} />;
  const segments = (Object.keys(SEGMENTS) as SegmentId[]).map((id) => ({ id, ...SEGMENTS[id] }));
  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3"><Link href="/app/campagnes"><ArrowLeft /> Campagnes</Link></Button>
      <PageHeader title="Nouvelle campagne" description="Choisissez votre audience, rédigez votre message et prévisualisez-le avant l'envoi." />
      <CampaignWizard merchantName={merchant.name} segments={segments} />
    </>
  );
}
