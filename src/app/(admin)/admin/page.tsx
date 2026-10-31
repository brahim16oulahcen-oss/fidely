import Link from "next/link";
import { Store, CheckCircle2, Euro, TrendingUp, CreditCard, ArrowLeftRight, UserMinus, LifeBuoy } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { platformOverview, listMerchantsAdmin } from "@/features/admin/service";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DonutChart, TrendChart, BarsChart } from "@/components/analytics/charts";
import { formatEurosRound, formatNumber, formatRelative } from "@/lib/utils/format";
import { MerchantStatusBadge } from "@/components/admin/merchant-status-badge";

export default async function AdminHome() {
  const user = await requireAdminPage();
  const repos = getRepos();
  const o = await platformOverview(repos, user);
  const merchants = (await listMerchantsAdmin(repos, user)).sort((a, b) => b.transactions30 - a.transactions30);
  return (
    <>
      <PageHeader title="Vue d'ensemble de la plateforme" eyebrow={<Badge variant="demo">Revenus simulés · données fictives</Badge>} description="Indicateurs calculés à partir des abonnements et de l'activité des commerçants." />
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4" data-testid="admin-kpis">
        <KpiCard label="Commerçants" value={formatNumber(o.merchants)} icon={Store} hint={`${o.trialMerchants} en essai`} />
        <KpiCard label="Commerçants actifs" value={formatNumber(o.activeMerchants)} icon={CheckCircle2} hint={`${o.suspended} suspendu(s)`} />
        <KpiCard label="MRR simulé" value={formatEurosRound(o.mrr)} icon={Euro} definition="Somme des prix mensuels des abonnements actifs ou en retard de paiement (hors essais)." />
        <KpiCard label="ARR simulé" value={formatEurosRound(o.arr)} icon={TrendingUp} definition="MRR × 12." />
        <KpiCard label="Cartes actives" value={formatNumber(o.cards)} icon={CreditCard} />
        <KpiCard label="Transactions" value={formatNumber(o.transactions)} icon={ArrowLeftRight} hint={`${formatNumber(o.transactions30)} sur 30 j`} />
        <KpiCard label="Résiliations simulées" value={formatNumber(o.churned)} icon={UserMinus} hint={`${o.churned90} sur 90 j`} />
        <KpiCard label="Tickets ouverts" value={formatNumber(o.openTickets)} icon={LifeBuoy} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2"><CardHeader><CardTitle>MRR simulé sur 12 mois</CardTitle></CardHeader><CardContent><TrendChart data={o.mrrSeries.map((m) => ({ date: m.mois, mrr: m.mrr }))} series={[{ key: "mrr", name: "MRR (€)" }]} label="Évolution du MRR" unit=" €" /></CardContent></Card>
        <Card><CardHeader><CardTitle>Abonnements par offre</CardTitle></CardHeader><CardContent><DonutChart data={o.byPlan} label="Abonnements par offre" /></CardContent></Card>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Transactions par mois</CardTitle><CardDescription>Toute la plateforme</CardDescription></CardHeader><CardContent><BarsChart data={o.txSeries} xKey="mois" series={[{ key: "transactions", name: "Transactions" }]} label="Transactions par mois" /></CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Commerçants les plus actifs (30 j)</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {merchants.slice(0, 6).map((m) => (
                <li key={m.merchant.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <Link href={`/admin/commercants/${m.merchant.id}`} className="flex-1 truncate font-medium hover:underline">{m.merchant.name}</Link>
                  <MerchantStatusBadge status={m.merchant.status} />
                  <span className="w-28 text-right tabular text-muted">{formatNumber(m.transactions30)} opérations</span>
                  <span className="hidden w-24 text-right text-xs text-muted sm:block">{formatRelative(m.lastActivity)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
