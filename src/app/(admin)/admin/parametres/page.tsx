import { requireAdminPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { env } from "@/config/env";
import { brand } from "@/config/brand";
import { walletProviders } from "@/lib/wallet";
import { getBillingProvider, StripeBillingProvider } from "@/lib/billing";
import { getMessagingProvider } from "@/lib/messaging";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/utils/format";

export const metadata = { title: "Paramètres plateforme" };

export default async function AdminSettings() {
  await requireAdminPage();
  const meta = getRepos().meta();
  const integrations = [
    { name: "Base de données", status: "Démo (fichier local)", ok: false, detail: "Supabase : schéma et politiques RLS fournis dans supabase/migrations" },
    { name: "Paiements", status: StripeBillingProvider.isConfigured() ? "Stripe : clés présentes" : "Intégration à configurer", ok: false, detail: getBillingProvider().label },
    { name: "Envois email / SMS", status: "Intégration à configurer", ok: false, detail: getMessagingProvider().label },
    { name: "Apple Wallet", status: walletProviders.apple.isConfigured() ? "Certificats présents" : "Intégration à configurer", ok: false, detail: `${walletProviders.apple.missingConfiguration().length} variable(s) manquante(s)` },
    { name: "Google Wallet", status: walletProviders.google.isConfigured() ? "Identifiants présents" : "Intégration à configurer", ok: false, detail: `${walletProviders.google.missingConfiguration().length} variable(s) manquante(s)` },
    { name: "Carte web + QR", status: "Opérationnel", ok: true, detail: "DemoWalletProvider" },
  ];
  return (
    <>
      <PageHeader title="Paramètres plateforme" description="Configuration en lecture seule : elle se modifie par variables d'environnement." />
      {env.demoMode && <Alert variant="demo" className="mb-4" title="DEMO_MODE=true">Sélecteur de rôle actif et données fictives. Ne jamais activer ce mode avec des données réelles.</Alert>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Général</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Nom du produit</span><span>{brand.name} <span className="text-xs text-muted">(src/config/brand.ts)</span></span></div>
            <div className="flex justify-between"><span className="text-muted">Mode démonstration</span><Badge variant={env.demoMode ? "warning" : "success"}>{env.demoMode ? "Activé" : "Désactivé"}</Badge></div>
            <div className="flex justify-between"><span className="text-muted">Dataset généré le</span><span>{formatDateTime(meta.seededAt)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Version du schéma démo</span><span>v{meta.version}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Intégrations</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">{integrations.map((i) => <li key={i.name} className="flex items-center justify-between gap-3 py-2.5"><span><span className="font-medium">{i.name}</span><span className="block text-xs text-muted">{i.detail}</span></span><Badge variant={i.ok ? "success" : "warning"}>{i.status}</Badge></li>)}</ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
