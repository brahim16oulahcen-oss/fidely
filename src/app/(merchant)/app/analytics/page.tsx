import Link from "next/link";
import { Lock } from "lucide-react";
import { requireMerchantPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { getPlan } from "@/config/plans";
import { loadDataset } from "@/features/analytics/loader";
import { byProgram, byStore, computeKpis, METRICS, popularRewards, rangeFromPreset, returnRateSeries, timeSeries, visitFrequency } from "@/features/analytics/metrics";
import { listCampaigns } from "@/features/campaigns/service";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { BarsChart, DonutChart, LinesChart, TrendChart } from "@/components/analytics/charts";
import { formatEurosRound, formatNumber, formatPercent } from "@/lib/utils/format";
import { env } from "@/config/env";
import { PROGRAM_TYPE_LABEL } from "@/features/loyalty/engine";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireMerchantPage("analytics.read");
  const sp = await searchParams;
  const range = rangeFromPreset(sp.periode ?? "90", sp.du, sp.au);
  const repos = getRepos();
  const plan = getPlan(ctx.merchant.planId);
  const d = await loadDataset(repos, ctx.merchant.id);
  const k = computeKpis(d, range, ctx.merchant.settings.attributionRate);
  const series = timeSeries(d, range);
  const freq = visitFrequency(d);
  const rr = returnRateSeries(d, range);
  const rewards = popularRewards(d, range);
  const stores = byStore(d, range);
  const programs = byProgram(d);
  const campaigns = plan.features.campaigns ? (await listCampaigns({ ...ctx, repos })).filter((c) => c.status === "sent").slice(0, 6) : [];
  const advanced = plan.features.analyticsAdvanced;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Indicateurs calculés à partir des passages, inscriptions et récompenses enregistrés."
        eyebrow={env.demoMode && ctx.merchant.isDemoSeed ? <Badge variant="demo">Données fictives de démonstration</Badge> : undefined}
        actions={<PeriodFilter current={range.preset} from={sp.du} to={sp.au} />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {([
          ["revenueRecorded", k.revenueRecorded],
          ["revenueMembers", k.revenueMembers],
          ["revenueIncremental", k.revenueIncremental],
        ] as const).map(([key, value]) => (
          <Card key={key}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted">{METRICS[key].label}</p>
                {key === "revenueIncremental" && <Badge variant="warning">Estimation</Badge>}
              </div>
              <p className="mt-1 text-2xl font-semibold tabular">{formatEurosRound(value)}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{METRICS[key].definition}{key === "revenueIncremental" ? ` Taux retenu : ${Math.round(ctx.merchant.settings.attributionRate * 100)} % (modifiable dans Paramètres).` : ""}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Évolution des membres</CardTitle><CardDescription>Nombre cumulé d&apos;inscrits</CardDescription></CardHeader>
          <CardContent><TrendChart data={series} series={[{ key: "membres", name: "Membres" }]} label="Évolution du nombre de membres" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Fréquence des visites</CardTitle><CardDescription>Clients par nombre total de passages</CardDescription></CardHeader>
          <CardContent><BarsChart data={freq} xKey="tranche" series={[{ key: "clients", name: "Clients" }]} label="Fréquence des visites" /></CardContent>
        </Card>
      </div>

      {advanced ? (
        <>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Taux de retour</CardTitle><CardDescription>{METRICS.returnRate.definition} Moyenne période : {formatPercent(k.returnRate)}</CardDescription></CardHeader>
              <CardContent><LinesChart data={rr} series={[{ key: "taux", name: "Taux de retour" }]} unit=" %" label="Taux de retour" /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Récompenses débloquées et utilisées</CardTitle><CardDescription>{formatNumber(k.rewardsUnlocked)} débloquées · {formatNumber(k.rewardsRedeemed)} utilisées sur la période</CardDescription></CardHeader>
              <CardContent><BarsChart data={series} xKey="date" series={[{ key: "debloquees", name: "Débloquées" }, { key: "utilisees", name: "Utilisées" }]} label="Récompenses débloquées et utilisées" /></CardContent>
            </Card>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>Répartition par programme</CardTitle></CardHeader>
              <CardContent><DonutChart data={programs.map((p) => ({ name: `${p.name} (${PROGRAM_TYPE_LABEL[p.type]})`, value: p.membres }))} label="Membres par programme" /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Activité par établissement</CardTitle><CardDescription>Visites sur la période</CardDescription></CardHeader>
              <CardContent><BarsChart data={stores} xKey="name" layout="vertical" series={[{ key: "visites", name: "Visites" }]} height={Math.max(140, stores.length * 60)} label="Activité par établissement" /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Récompenses</CardTitle><CardDescription>Utilisations sur la période</CardDescription></CardHeader>
              <CardContent><BarsChart data={rewards.map((r) => ({ name: r.name, utilisees: r.utilisees }))} xKey="name" layout="vertical" series={[{ key: "utilisees", name: "Utilisées" }]} height={Math.max(140, rewards.length * 50)} label="Utilisation des récompenses" /></CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Performance des campagnes <Badge variant="demo">Envois simulés</Badge></CardTitle>
              <CardDescription>Ouvertures et clics simulés. Les visites attribuées sont réelles : passages des destinataires dans les 7 jours suivant l&apos;envoi.</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length ? (
                <BarsChart data={campaigns.map((c) => ({ name: c.name.length > 22 ? `${c.name.slice(0, 22)}…` : c.name, destinataires: c.stats.simulatedDelivered, visites: c.stats.attributedVisits }))} xKey="name" series={[{ key: "destinataires", name: "Destinataires" }, { key: "visites", name: "Visites attribuées" }]} label="Performance des campagnes" />
              ) : (
                <p className="text-sm text-muted">Aucune campagne envoyée. <Link className="text-primary hover:underline" href="/app/campagnes/nouvelle">Créer une campagne</Link></p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert className="mt-4" variant="info" title="Analytics avancées" action={<Button size="sm" asChild><Link href="/app/abonnement"><Lock /> Voir les offres</Link></Button>}>
          Taux de retour, performance des campagnes, répartition par établissement et par programme sont inclus à partir de l&apos;offre Pro.
        </Alert>
      )}

      <Card className="mt-4">
        <CardHeader><CardTitle>Définitions des indicateurs</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
            {Object.values(METRICS).map((m) => (
              <div key={m.label}>
                <dt className="font-medium">{m.label}</dt>
                <dd className="text-muted">{m.definition}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </>
  );
}
