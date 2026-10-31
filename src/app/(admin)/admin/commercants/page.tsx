import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { listMerchantsAdmin } from "@/features/admin/service";
import { PLANS } from "@/config/plans";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { MerchantLogo } from "@/components/loyalty/merchant-logo";
import { MerchantStatusBadge } from "@/components/admin/merchant-status-badge";
import { formatDate, formatNumber, formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Commerçants" };

export default async function AdminMerchants() {
  const user = await requireAdminPage();
  const rows = (await listMerchantsAdmin(getRepos(), user)).sort((a, b) => b.merchant.createdAt.localeCompare(a.merchant.createdAt));
  return (
    <>
      <PageHeader title="Commerçants" description={`${rows.length} comptes sur la plateforme.`} />
      <Card>
        <Table>
          <THead><TR className="hover:bg-transparent"><TH>Commerce</TH><TH className="hidden md:table-cell">Propriétaire</TH><TH>Offre</TH><TH>Statut</TH><TH className="text-right">Clients</TH><TH className="hidden lg:table-cell text-right">Opérations 30 j</TH><TH className="hidden lg:table-cell">Dernière activité</TH><TH className="hidden xl:table-cell">Création</TH></TR></THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.merchant.id}>
                <TD><Link href={`/admin/commercants/${r.merchant.id}`} className="flex items-center gap-3 font-medium hover:underline" data-testid="admin-merchant-row"><MerchantLogo icon={r.merchant.logo.icon} imageDataUrl={r.merchant.logo.imageDataUrl} background={r.merchant.colors.primary} color={r.merchant.colors.text} name={r.merchant.name} className="size-8 rounded-lg" />{r.merchant.name}</Link></TD>
                <TD className="hidden md:table-cell text-muted">{r.owner?.name ?? "—"}</TD>
                <TD>{PLANS[r.merchant.planId].name}</TD>
                <TD><MerchantStatusBadge status={r.merchant.status} /></TD>
                <TD className="text-right tabular">{formatNumber(r.customers)}</TD>
                <TD className="hidden lg:table-cell text-right tabular">{formatNumber(r.transactions30)}</TD>
                <TD className="hidden lg:table-cell text-muted">{formatRelative(r.lastActivity)}</TD>
                <TD className="hidden xl:table-cell text-muted">{formatDate(r.merchant.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
