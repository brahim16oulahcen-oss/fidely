import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TicketStatusSelect } from "@/components/admin/admin-controls";
import { formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Support" };

export default async function AdminSupport() {
  await requireAdminPage();
  const repos = getRepos();
  const tickets = (await repos.tickets.findMany()).sort((a, b) => (a.status === "resolved" ? 1 : 0) - (b.status === "resolved" ? 1 : 0) || b.createdAt.localeCompare(a.createdAt));
  const merchants = new Map((await repos.merchants.findMany()).map((m) => [m.id, m.name]));
  return (
    <>
      <PageHeader title="Support" description="Demandes et incidents remontés par les commerçants." />
      <Card>
        <Table>
          <THead><TR className="hover:bg-transparent"><TH>Demande</TH><TH>Commerce</TH><TH>Type</TH><TH>Priorité</TH><TH className="hidden md:table-cell">Créée</TH><TH>Statut</TH></TR></THead>
          <TBody>{tickets.map((t) => <TR key={t.id}><TD><p className="font-medium">{t.subject}</p><p className="line-clamp-1 text-xs text-muted">{t.body}</p></TD><TD><Link className="hover:underline" href={`/admin/commercants/${t.merchantId}`}>{merchants.get(t.merchantId)}</Link></TD><TD>{t.kind === "incident" ? "Incident" : t.kind === "billing" ? "Facturation" : "Question"}</TD><TD><Badge variant={t.priority === "high" ? "danger" : t.priority === "normal" ? "default" : "neutral"}>{t.priority === "high" ? "Haute" : t.priority === "normal" ? "Normale" : "Basse"}</Badge></TD><TD className="hidden md:table-cell text-muted">{formatRelative(t.createdAt)}</TD><TD><TicketStatusSelect id={t.id} status={t.status} /></TD></TR>)}</TBody>
        </Table>
      </Card>
    </>
  );
}
