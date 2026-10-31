import { requireMerchantPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { ScannerWorkspace } from "@/components/scanner/scanner-workspace";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { env } from "@/config/env";
import { ROLE_LABEL } from "@/lib/auth/permissions";

export const metadata = { title: "Scanner" };

export default async function ScannerPage({ searchParams }: { searchParams: Promise<{ interdit?: string }> }) {
  const { actor, merchant } = await requireMerchantPage("scan");
  const sp = await searchParams;
  const repos = getRepos();
  const stores = await repos.stores.findMany({ merchantId: merchant.id });
  let recentDemo: { cardId: string; name: string; email: string; lastVisitAt: string | null; scanCode: string }[] = [];
  if (env.demoMode) {
    const cards = (await repos.cards.findMany({ merchantId: merchant.id, status: "active" })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
    const customers = await repos.customers.findMany({ merchantId: merchant.id });
    const by = new Map(customers.map((c) => [c.id, c]));
    recentDemo = cards.map((c) => ({ cardId: c.id, name: `${by.get(c.customerId)?.firstName ?? ""} ${by.get(c.customerId)?.lastName ?? ""}`.trim(), email: "", lastVisitAt: c.lastVisitAt, scanCode: c.scanCode }));
  }
  return (
    <>
      <PageHeader
        eyebrow={<Badge variant="night">Espace employé · {ROLE_LABEL[actor.role]}</Badge>}
        title="Scanner"
        description="Identifiez le client, enregistrez son passage et remettez ses récompenses."
      />
      {sp.interdit && <Alert variant="warning" className="mb-4" title="Accès limité">Votre rôle ne donne pas accès à cette page. Le scanner reste disponible.</Alert>}
      <ScannerWorkspace
        stores={stores.map((s) => ({ id: s.id, name: s.name }))}
        demo={env.demoMode}
        canOverride={actor.role !== "staff"}
        suspended={merchant.status === "suspended" || merchant.status === "cancelled"}
        recentDemo={recentDemo}
      />
    </>
  );
}
