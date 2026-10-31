import { requireAdminPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { platformOverview } from "@/features/admin/service";
import { PLANS } from "@/config/plans";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarsChart } from "@/components/analytics/charts";
import { formatDate, formatEuros, formatEurosRound } from "@/lib/utils/format";

export const metadata = { title: "Revenus" };

export default async function AdminRevenue() {
  const user = await requireAdminPage();
  const repos = getRepos();
  const o = await platformOverview(repos, user);
  const invoices = (await repos.invoices.findMany()).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).slice(0, 30);
  const merchants = new Map((await repos.merchants.findMany()).map((m) => [m.id, m.name]));
  return (
    <>
      <PageHeader title="Revenus" eyebrow={<Badge variant="demo">Revenus simulés</Badge>} description="Aucune transaction financière réelle : chiffres issus des factures fictives." />
      <div className="grid gap-4 sm:grid-cols-4">
        {[["MRR simulé", o.mrr], ["ARR simulé", o.arr], ["Encaissé (fictif)", o.revenueCollected], ["Impayés (fictifs)", o.openInvoices]].map(([l, v]) => (
          <Card key={l as string}><CardContent className="pt-5"><p className="text-sm text-muted">{l}</p><p className="text-2xl font-semibold tabular">{formatEurosRound(v as number)}</p></CardContent></Card>
        ))}
      </div>
      <Card className="mt-4"><CardHeader><CardTitle>MRR mensuel</CardTitle></CardHeader><CardContent><BarsChart data={o.mrrSeries} xKey="mois" series={[{ key: "mrr", name: "MRR (€)" }]} unit=" €" label="MRR mensuel" /></CardContent></Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Dernières factures</CardTitle></CardHeader>
        <CardContent className="px-0">
          <Table>
            <THead><TR className="hover:bg-transparent"><TH>Numéro</TH><TH>Commerce</TH><TH>Offre</TH><TH>Date</TH><TH className="text-right">Montant HT</TH><TH>Statut</TH></TR></THead>
            <TBody>{invoices.map((i) => <TR key={i.id}><TD className="font-mono text-xs">{i.number}</TD><TD>{merchants.get(i.merchantId)}</TD><TD>{PLANS[i.planId].name}</TD><TD className="text-muted">{formatDate(i.issuedAt)}</TD><TD className="text-right tabular">{formatEuros(i.amountCents)}</TD><TD><Badge variant={i.status === "paid" ? "success" : "warning"}>{i.status === "paid" ? "Payée" : "Impayée"}</Badge></TD></TR>)}</TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
