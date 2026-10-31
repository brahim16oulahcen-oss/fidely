import Link from "next/link";
import { DemoHub } from "@/components/marketing/demo-hub";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { env } from "@/config/env";
import { DEMO_PASSWORD } from "@/lib/demo/fixtures";

export const metadata = { title: "Démonstration" };
export const dynamic = "force-dynamic";

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ reinitialise?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <Badge variant="demo">Mode démonstration</Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Explorez Fidely sous tous les angles</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">8 commerces fictifs de Rouen, 928 clients et plusieurs mois de passages. Choisissez un profil : vous pourrez en changer à tout moment avec le bouton « Mode démo » en bas à gauche.</p>
        {sp.reinitialise === "1" && <Alert variant="success" className="mt-6" title="Démo réinitialisée">Le jeu de données d&apos;origine a été restauré.</Alert>}
        <div className="mt-10">
          {env.demoMode ? <DemoHub /> : <Alert variant="warning" title="Mode démonstration désactivé">Activez DEMO_MODE=true pour accéder aux profils de démonstration.</Alert>}
        </div>
        {env.demoMode && (
          <p className="mt-8 text-sm text-muted">Vous préférez vous connecter ? Tous les comptes de démo utilisent le mot de passe <code className="rounded bg-surface-2 px-1.5 py-0.5">{DEMO_PASSWORD}</code>, par exemple <code className="rounded bg-surface-2 px-1.5 py-0.5">julien@demo.fidely.example</code>. <Link href="/connexion" className="text-primary underline-offset-4 hover:underline">Page de connexion</Link>.</p>
        )}
      </div>
    </div>
  );
}
