import Link from "next/link";
import { QrCode, ExternalLink } from "lucide-react";
import { requireMerchantPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { CardEditor } from "@/components/wallet/card-editor";
import { WalletButtons } from "@/components/wallet/wallet-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { walletProviders } from "@/lib/wallet";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Cartes digitales" };

export default async function CardsPage({ searchParams }: { searchParams: Promise<{ programme?: string }> }) {
  const { merchant } = await requireMerchantPage("cards.manage");
  const sp = await searchParams;
  const repos = getRepos();
  const programs = await repos.programs.findMany({ merchantId: merchant.id });
  const sample = await repos.cards.findOne({ merchantId: merchant.id, status: "active" });
  const statuses = (["apple", "google"] as const).map((id) => ({ id, label: walletProviders[id].label, configured: walletProviders[id].isConfigured(), missing: walletProviders[id].missingConfiguration() }));
  if (!programs.length) return <EmptyState icon={QrCode} title="Aucun programme" description="Créez un programme pour personnaliser sa carte." action={<Button asChild><Link href="/app/programmes">Créer un programme</Link></Button>} />;
  return (
    <>
      <PageHeader
        title="Cartes digitales"
        description="Personnalisez la carte que vos clients gardent sur leur téléphone. Chaque modification est immédiatement visible sur les cartes existantes."
        actions={
          <>
            <Button variant="outline" asChild><Link href="/app/qr-inscription"><QrCode /> QR d&apos;inscription</Link></Button>
            {sample && <Button variant="outline" asChild><Link href={`/carte/${sample.token}`} target="_blank"><ExternalLink /> Voir une vraie carte client</Link></Button>}
          </>
        }
      />
      <CardEditor programs={programs.map((p) => ({ id: p.id, name: p.name, rules: p.rules, card: p.card }))} selectedId={sp.programme ?? merchant.primaryProgramId ?? programs[0].id} merchantName={merchant.name} logo={merchant.logo} />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Apple Wallet &amp; Google Wallet <Badge variant="warning">Intégration à configurer</Badge></CardTitle>
          <CardDescription>
            La carte web fonctionne dès maintenant, sans application : vos clients l&apos;ajoutent à leur écran d&apos;accueil. L&apos;ajout aux Wallets officiels nécessite des certificats et un compte émetteur (voir les prérequis).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WalletButtons statuses={statuses} />
        </CardContent>
      </Card>
    </>
  );
}
