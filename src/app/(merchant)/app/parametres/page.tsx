import Link from "next/link";
import { MapPin, ShieldCheck, FileText } from "lucide-react";
import { requireMerchantPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { getPlan } from "@/config/plans";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddStoreDialog, BrandingForm, SettingsForm } from "@/components/settings/settings-forms";
import { Alert } from "@/components/ui/alert";
import { formatDateTime, formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const { merchant } = await requireMerchantPage("settings.manage");
  const repos = getRepos();
  const stores = await repos.stores.findMany({ merchantId: merchant.id });
  const consents = (await repos.consentLogs.findMany({ merchantId: merchant.id })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const customers = (await repos.customers.findMany({ merchantId: merchant.id })).filter((c) => !c.deletedAt);
  const plan = getPlan(merchant.planId);
  return (
    <>
      <PageHeader title="Paramètres" description="Informations du commerce, identité visuelle, sécurité et données personnelles." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Commerce</CardTitle></CardHeader>
            <CardContent>
              <SettingsForm initial={{ name: merchant.name, description: merchant.description, address: merchant.address, postalCode: merchant.postalCode, city: merchant.city, phone: merchant.phone, email: merchant.email, siret: merchant.siret ?? "", minSecondsBetweenVisits: merchant.settings.minSecondsBetweenVisits, maxAmount: merchant.settings.maxAmountCents / 100, retentionMonths: merchant.settings.retentionMonths, attributionPct: Math.round(merchant.settings.attributionRate * 100) }} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Identité visuelle</CardTitle></CardHeader>
            <CardContent><BrandingForm name={merchant.name} initial={{ icon: merchant.logo.icon, primary: merchant.colors.primary, text: merchant.colors.text, accent: merchant.colors.accent }} /></CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div><CardTitle>Établissements</CardTitle><CardDescription>{stores.length} / {plan.limits.stores} inclus</CardDescription></div>
            </CardHeader>
            <CardContent className="space-y-3">
              {stores.map((s) => <div key={s.id} className="flex items-start gap-2 text-sm"><MapPin className="mt-0.5 size-4 text-muted" /><div><p className="font-medium">{s.name}</p><p className="text-muted">{s.address}</p></div></div>)}
              <AddStoreDialog disabled={stores.length >= plan.limits.stores} reason={stores.length >= plan.limits.stores ? "Offre Business requise pour plusieurs établissements" : undefined} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-muted" /> Données personnelles (RGPD)</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted">Vous êtes responsable du traitement des données de vos clients ; Fidely agit comme sous-traitant.</p>
              <ul className="space-y-1.5">
                <li><Link className="inline-flex items-center gap-1.5 text-primary hover:underline" href="/legal/confidentialite"><FileText className="size-4" /> Politique de confidentialité</Link></li>
                <li><Link className="inline-flex items-center gap-1.5 text-primary hover:underline" href="/legal/traitement"><FileText className="size-4" /> Informations sur le traitement</Link></li>
                <li><Link className="inline-flex items-center gap-1.5 text-primary hover:underline" href="/legal/cgu"><FileText className="size-4" /> Conditions d&apos;utilisation</Link></li>
              </ul>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-surface-2 p-2"><p className="text-lg font-semibold tabular">{formatNumber(customers.filter((c) => c.consent.email).length)}</p><p className="text-xs text-muted">consentements email</p></div>
                <div className="rounded-lg bg-surface-2 p-2"><p className="text-lg font-semibold tabular">{formatNumber(customers.filter((c) => c.consent.sms).length)}</p><p className="text-xs text-muted">consentements SMS</p></div>
              </div>
              <div>
                <p className="mb-2 font-medium">Journal des consentements</p>
                <ul className="max-h-64 space-y-1.5 overflow-y-auto text-xs">
                  {consents.slice(0, 25).map((c) => <li key={c.id} className="flex justify-between gap-2 text-muted"><span>{formatDateTime(c.createdAt)} · {c.channel} · {c.granted ? "accordé" : "refusé/retiré"}</span><span className="truncate">{c.source}</span></li>)}
                </ul>
              </div>
              <Alert variant="warning">Ces outils facilitent la conformité mais ne la garantissent pas : faites valider vos mentions et votre registre de traitement par un professionnel.</Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
