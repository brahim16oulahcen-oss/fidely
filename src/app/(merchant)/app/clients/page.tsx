import Link from "next/link";
import { Users, Gift } from "lucide-react";
import { requireMerchantPage } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getRepos } from "@/lib/db";
import { filterRows, listCustomerRows, PAGE_SIZE } from "@/features/customers/service";
import { customerFilterSchema } from "@/features/customers/schemas";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomersToolbar, SortHeader } from "@/components/customers/customers-toolbar";
import { StatusBadge } from "@/components/customers/status-badge";
import { AddCustomerButton } from "@/components/dashboard/add-customer-button";
import { formatDate, formatNumber, formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Clients" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireMerchantPage("customers.read");
  const sp = await searchParams;
  const filter = customerFilterSchema.parse({ ...sp, q: sp.q || undefined });
  const rows = await listCustomerRows({ ...ctx, repos: getRepos() });
  const counts: Record<string, number> = {};
  for (const s of ["all", "new", "active", "loyal", "vip", "inactive"] as const) counts[s] = filterRows(rows, { ...filter, segment: s, q: undefined, consent: "any" }).length;
  const filtered = filterRows(rows, filter);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(filter.page, pages);
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const qs = (p: number) => {
    const u = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    u.set("page", String(p));
    return `?${u.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Clients"
        description={`${formatNumber(rows.length)} membres inscrits au programme de ${ctx.merchant.name}.`}
        actions={can(ctx.actor, "customers.write") ? <AddCustomerButton variant="button" /> : undefined}
      />
      <Card className="p-4">
        <CustomersToolbar counts={counts} canExport={can(ctx.actor, "customers.export")} />
      </Card>

      <Card className="mt-4">
        {slice.length === 0 ? (
          <EmptyState className="m-4 border-0" icon={Users} title="Aucun client ne correspond" description="Modifiez la recherche ou les filtres." />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH><SortHeader label="Client" field="name" /></TH>
                <TH className="hidden md:table-cell"><SortHeader label="Inscription" field="createdAt" /></TH>
                <TH><SortHeader label="Dernière visite" field="lastVisitAt" /></TH>
                <TH className="text-right"><SortHeader label="Visites" field="visits" /></TH>
                <TH className="hidden sm:table-cell text-right"><SortHeader label="Solde" field="points" /></TH>
                <TH className="hidden lg:table-cell text-right">Récompenses</TH>
                <TH>Statut</TH>
              </TR>
            </THead>
            <TBody>
              {slice.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <Link href={`/app/clients/${r.id}`} className="flex items-center gap-3 font-medium hover:underline" data-testid="customer-row">
                      <Avatar name={r.name} className="size-8" />
                      <span className="min-w-0">
                        <span className="block truncate">{r.name}</span>
                        <span className="block truncate text-xs font-normal text-muted">{r.email}</span>
                      </span>
                    </Link>
                  </TD>
                  <TD className="hidden md:table-cell text-muted">{formatDate(r.createdAt)}</TD>
                  <TD className="text-muted">{formatRelative(r.lastVisitAt)}</TD>
                  <TD className="text-right tabular">{r.visits}</TD>
                  <TD className="hidden sm:table-cell text-right tabular">{r.balanceLabel}</TD>
                  <TD className="hidden lg:table-cell text-right">
                    <span className="inline-flex items-center gap-1 tabular">
                      {r.rewardsAvailable > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-success-soft px-1.5 text-xs font-medium text-success-fg"><Gift className="size-3" />{r.rewardsAvailable}</span>}
                      <span className="text-muted">{r.rewardsUsed} utilisée{r.rewardsUsed > 1 ? "s" : ""}</span>
                    </span>
                  </TD>
                  <TD><StatusBadge status={r.status} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
          <span>{filtered.length ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} sur ${formatNumber(filtered.length)}` : "0 résultat"}</span>
          <div className="flex gap-2">
            {page > 1 ? <Button variant="outline" size="sm" asChild><Link href={qs(page - 1)} scroll={false}>Précédent</Link></Button> : <Button variant="outline" size="sm" disabled>Précédent</Button>}
            {page < pages ? <Button variant="outline" size="sm" asChild><Link href={qs(page + 1)} scroll={false}>Suivant</Link></Button> : <Button variant="outline" size="sm" disabled>Suivant</Button>}
          </div>
        </div>
      </Card>
    </>
  );
}
