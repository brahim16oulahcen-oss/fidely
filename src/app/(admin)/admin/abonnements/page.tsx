import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { listMerchantsAdmin } from "@/features/admin/service";
import { PLANS, PLAN_ORDER } from "@/config/plans";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminPlanSelect } from "@/components/admin/admin-controls";
import { formatDate, formatEurosRound } from "@/lib/utils/format";

export const metadata = { title: "Abonnements" };
const SUB: Record<string, { l: string; v: "success" | "default" | "warning" | "neutral" }> = { active: { l: "Actif", v: "success" }, trialing: { l: "Essai", v: "default" }, past_due: { l: "Impayé", v: "warning" }, cancelled: { l: "Résilié", v: "neutral" } };

export default async function AdminSubscriptions() {
  const user = await requireAdminPage();
  const rows = await listMerchantsAdmin(getRepos(), user);
  return (
    <>
      <PageHeader title="Abonnements" description="Abonnements fictifs — aucun prélèvement réel." eyebrow={<Badge variant="demo">Simulation</Badge>} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        {PLAN_ORDER.map((p) => {
          const n = rows.filter((r) => r.subscription?.planId === p && r.subscription.status !== "cancelled").length;
          return <Card key={p}><CardContent className="pt-5"><p className="text-sm text-muted">{PLANS[p].name} · {formatEurosRound(PLANS[p].priceCents)}/mois</p><p className="text-2xl font-semibold tabular">{n}</p></CardContent></Card>;
        })}
      </div>
      <Card>
        <Table>
          <THead><TR className="hover:bg-transparent"><TH>Commerce</TH><TH>Offre</TH><TH>Statut</TH><TH className="hidden md:table-cell">Début</TH><TH className="hidden md:table-cell">Échéance</TH><TH className="text-right">MRR</TH></TR></THead>
          <TBody>
            {rows.map((r) => r.subscription && (
              <TR key={r.merchant.id}>
                <TD><Link className="font-medium hover:underline" href={`/admin/commercants/${r.merchant.id}`}>{r.merchant.name}</Link></TD>
                <TD><AdminPlanSelect merchantId={r.merchant.id} planId={r.merchant.planId} /></TD>
                <TD><Badge variant={SUB[r.subscription.status].v}>{SUB[r.subscription.status].l}</Badge></TD>
                <TD className="hidden md:table-cell text-muted">{formatDate(r.subscription.startedAt)}</TD>
                <TD className="hidden md:table-cell text-muted">{r.subscription.cancelledAt ? `Résilié le ${formatDate(r.subscription.cancelledAt)}` : formatDate(r.subscription.currentPeriodEnd)}</TD>
                <TD className="text-right tabular">{r.subscription.status === "active" || r.subscription.status === "past_due" ? formatEurosRound(PLANS[r.subscription.planId].priceCents) : "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
