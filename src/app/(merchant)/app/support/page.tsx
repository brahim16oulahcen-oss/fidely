import { requireMerchantPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupportForm } from "@/components/settings/support-form";
import { formatRelative } from "@/lib/utils/format";
import { brand } from "@/config/brand";

export const metadata = { title: "Aide & support" };

export default async function SupportPage() {
  const { merchant } = await requireMerchantPage();
  const tickets = (await getRepos().tickets.findMany({ merchantId: merchant.id })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <PageHeader title="Aide & support" description={`Une question ? L'équipe ${brand.name} vous répond (demandes visibles dans le back-office administrateur).`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Nouvelle demande</CardTitle></CardHeader><CardContent><SupportForm /></CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Vos demandes</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {tickets.map((t) => (
                <li key={t.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><p className="font-medium">{t.subject}</p><Badge variant={t.status === "resolved" ? "success" : t.status === "pending" ? "warning" : "default"}>{t.status === "resolved" ? "Résolue" : t.status === "pending" ? "En attente" : "Ouverte"}</Badge></div>
                  <p className="mt-1 line-clamp-2 text-muted">{t.body}</p>
                  <p className="mt-1 text-xs text-muted">{formatRelative(t.createdAt)}</p>
                </li>
              ))}
              {tickets.length === 0 && <li className="text-sm text-muted">Aucune demande.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
