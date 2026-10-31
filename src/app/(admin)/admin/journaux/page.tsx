import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/format";

export const metadata = { title: "Journaux" };

const FILTERS = [
  { id: "", label: "Tout" },
  { id: "merchant.", label: "Commerces" },
  { id: "program.", label: "Programmes" },
  { id: "reward.", label: "Récompenses" },
  { id: "campaign.", label: "Campagnes" },
  { id: "subscription.", label: "Abonnements" },
  { id: "team.", label: "Équipes" },
  { id: "customer", label: "Clients" },
];

export default async function AdminLogs({ searchParams }: { searchParams: Promise<{ type?: string; page?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const repos = getRepos();
  const merchants = new Map((await repos.merchants.findMany()).map((m) => [m.id, m.name]));
  const all = (await repos.auditLogs.findMany()).filter((l) => !sp.type || l.action.startsWith(sp.type)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const page = Math.max(1, Number(sp.page) || 1);
  const logs = all.slice((page - 1) * 50, page * 50);
  return (
    <>
      <PageHeader title="Journal d'audit" description="Toutes les actions sensibles, horodatées et attribuées. Lecture seule." />
      <div className="mb-4 flex flex-wrap gap-1">{FILTERS.map((f) => <Button key={f.id} size="sm" variant={(sp.type ?? "") === f.id ? "night" : "ghost"} asChild><Link href={f.id ? `?type=${f.id}` : "?"}>{f.label}</Link></Button>)}</div>
      <Card>
        <Table>
          <THead><TR className="hover:bg-transparent"><TH>Date</TH><TH>Acteur</TH><TH>Action</TH><TH>Cible</TH><TH className="hidden md:table-cell">Commerce</TH><TH className="hidden lg:table-cell">Détails</TH></TR></THead>
          <TBody>{logs.map((l) => <TR key={l.id}><TD className="whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</TD><TD>{l.actorLabel}</TD><TD className="font-mono text-xs">{l.action}</TD><TD>{l.target}</TD><TD className="hidden md:table-cell text-muted">{l.merchantId ? merchants.get(l.merchantId) : "Plateforme"}</TD><TD className="hidden max-w-xs truncate lg:table-cell font-mono text-xs text-muted">{l.metadata ? JSON.stringify(l.metadata) : ""}</TD></TR>)}</TBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
          <span>{all.length} entrées</span>
          <div className="flex gap-2">
            {page > 1 && <Button size="sm" variant="outline" asChild><Link href={`?${new URLSearchParams({ ...(sp.type ? { type: sp.type } : {}), page: String(page - 1) })}`}>Précédent</Link></Button>}
            {page * 50 < all.length && <Button size="sm" variant="outline" asChild><Link href={`?${new URLSearchParams({ ...(sp.type ? { type: sp.type } : {}), page: String(page + 1) })}`}>Suivant</Link></Button>}
          </div>
        </div>
      </Card>
    </>
  );
}
