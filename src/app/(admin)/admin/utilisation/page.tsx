import { requireAdminPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { listMerchantsAdmin } from "@/features/admin/service";
import { PLANS } from "@/config/plans";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Progress } from "@/components/ui/misc";
import { BarsChart } from "@/components/analytics/charts";
import { formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Utilisation" };

export default async function AdminUsage() {
  const user = await requireAdminPage();
  const rows = (await listMerchantsAdmin(getRepos(), user)).sort((a, b) => b.transactions30 - a.transactions30);
  return (
    <>
      <PageHeader title="Utilisation" description="Activité et consommation des limites par commerçant." />
      <Card><CardHeader><CardTitle>Opérations sur 30 jours</CardTitle></CardHeader><CardContent><BarsChart data={rows.map((r) => ({ name: r.merchant.name, operations: r.transactions30 }))} xKey="name" layout="vertical" series={[{ key: "operations", name: "Opérations" }]} height={rows.length * 44 + 40} label="Opérations par commerçant" /></CardContent></Card>
      <Card className="mt-4">
        <Table>
          <THead><TR className="hover:bg-transparent"><TH>Commerce</TH><TH>Clients / limite</TH><TH className="text-right">Opérations totales</TH><TH className="text-right">30 j</TH></TR></THead>
          <TBody>{rows.map((r) => { const lim = PLANS[r.merchant.planId].limits.customers; return <TR key={r.merchant.id}><TD className="font-medium">{r.merchant.name}</TD><TD className="min-w-48"><div className="flex items-center gap-2"><Progress value={(r.customers / lim) * 100} barClassName={r.customers / lim > 0.9 ? "bg-warning" : undefined} label="Utilisation" /><span className="w-24 shrink-0 text-right text-xs tabular text-muted">{formatNumber(r.customers)} / {formatNumber(lim)}</span></div></TD><TD className="text-right tabular">{formatNumber(r.transactions)}</TD><TD className="text-right tabular">{formatNumber(r.transactions30)}</TD></TR>; })}</TBody>
        </Table>
      </Card>
    </>
  );
}
