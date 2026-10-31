import Link from "next/link";
import { Plus, Gift, Pencil } from "lucide-react";
import { requireMerchantPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RewardActiveSwitch, RewardFormDialog } from "@/components/loyalty/reward-dialogs";
import { formatDateTime, formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Récompenses" };

export default async function RewardsPage() {
  const { merchant } = await requireMerchantPage("rewards.manage");
  const repos = getRepos();
  const [rewards, programs, issuances, customers, users] = await Promise.all([
    repos.rewards.findMany({ merchantId: merchant.id }),
    repos.programs.findMany({ merchantId: merchant.id }),
    repos.issuances.findMany({ merchantId: merchant.id }),
    repos.customers.findMany({ merchantId: merchant.id }),
    repos.users.findMany(),
  ]);
  const programBy = new Map(programs.map((p) => [p.id, p]));
  const customerBy = new Map(customers.map((c) => [c.id, c]));
  const userBy = new Map(users.map((u) => [u.id, u.name]));
  const rewardBy = new Map(rewards.map((r) => [r.id, r]));
  const history = issuances.filter((i) => i.status === "redeemed").sort((a, b) => (b.redeemedAt ?? "").localeCompare(a.redeemedAt ?? "")).slice(0, 15);
  const progOptions = programs.map((p) => ({ id: p.id, name: p.name, type: p.type }));
  return (
    <>
      <PageHeader title="Récompenses" description="Définissez ce que vos clients peuvent gagner. Chaque récompense ne peut être utilisée qu'une seule fois." actions={programs.length ? <RewardFormDialog programs={progOptions} trigger={<Button><Plus /> Nouvelle récompense</Button>} /> : undefined} />
      <Card>
        {rewards.length === 0 ? (
          <EmptyState className="m-4" icon={Gift} title="Aucune récompense" description="Créez votre première récompense." />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Récompense</TH><TH className="hidden md:table-cell">Programme</TH><TH className="text-right">Coût</TH><TH className="hidden lg:table-cell text-right">Validité</TH><TH className="hidden lg:table-cell text-right">Stock</TH><TH className="text-right">Débloquées</TH><TH className="text-right">Utilisées</TH><TH>Active</TH><TH />
              </TR>
            </THead>
            <TBody>
              {rewards.map((r) => {
                const p = programBy.get(r.programId);
                const iss = issuances.filter((i) => i.rewardId === r.id);
                return (
                  <TR key={r.id}>
                    <TD>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted">{r.description}</p>
                      <div className="mt-1 flex gap-1">{r.autoUnlock && <Badge variant="outline">Automatique</Badge>}{r.cost === 0 && <Badge variant="outline">Cadeau</Badge>}</div>
                    </TD>
                    <TD className="hidden md:table-cell text-muted">{p?.name}</TD>
                    <TD className="text-right tabular">{r.cost === 0 ? "Offert" : `${r.cost} ${p?.type === "stamps" ? "passages" : "pts"}`}</TD>
                    <TD className="hidden lg:table-cell text-right text-muted">{r.validityDays} j</TD>
                    <TD className="hidden lg:table-cell text-right tabular">{r.quantity === null ? "∞" : `${Math.max(0, r.quantity - r.issuedCount)} / ${r.quantity}`}</TD>
                    <TD className="text-right tabular">{formatNumber(iss.length)}</TD>
                    <TD className="text-right tabular">{formatNumber(iss.filter((i) => i.status === "redeemed").length)}</TD>
                    <TD><RewardActiveSwitch id={r.id} active={r.active} /></TD>
                    <TD><RewardFormDialog reward={r} programs={progOptions} trigger={<Button variant="ghost" size="icon-sm" aria-label={`Modifier ${r.name}`}><Pencil /></Button>} /></TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
      <Card className="mt-6">
        <CardHeader><CardTitle>Historique des utilisations</CardTitle></CardHeader>
        <CardContent className="px-0">
          <Table>
            <THead><TR className="hover:bg-transparent"><TH>Date</TH><TH>Client</TH><TH>Récompense</TH><TH className="hidden sm:table-cell">Validée par</TH></TR></THead>
            <TBody>
              {history.map((i) => {
                const c = customerBy.get(i.customerId);
                return (
                  <TR key={i.id}>
                    <TD className="text-muted">{formatDateTime(i.redeemedAt!)}</TD>
                    <TD><Link href={`/app/clients/${i.customerId}`} className="hover:underline">{c ? `${c.firstName} ${c.lastName}` : "—"}</Link></TD>
                    <TD>{rewardBy.get(i.rewardId)?.name}</TD>
                    <TD className="hidden sm:table-cell text-muted">{i.redeemedBy ? userBy.get(i.redeemedBy) ?? "—" : "—"}</TD>
                  </TR>
                );
              })}
              {history.length === 0 && <TR><TD colSpan={4} className="text-center text-muted">Aucune récompense utilisée.</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
