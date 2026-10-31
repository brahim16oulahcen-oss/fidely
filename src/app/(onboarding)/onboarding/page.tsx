import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/context";
import { readSession } from "@/lib/auth/session";
import { getRepos } from "@/lib/db";
import { FidelyLogo } from "@/components/loyalty/fidely-logo";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Configuration de votre programme" };
export const dynamic = "force-dynamic";

/**
 * Juste après la création du commerce, la session est réécrite et la page est rafraîchie :
 * on la laisse affichée quelques minutes pour que l'étape 5 (QR d'inscription) reste visible.
 */
async function justCreated(userId: string) {
  const s = await readSession();
  if (!s?.mid) return false;
  const m = await getRepos().merchants.findById(s.mid);
  const member = (await getRepos().users.findById(userId))?.memberships.find((x) => x.merchantId === s.mid);
  return !!m && member?.role === "owner" && Date.now() - new Date(m.createdAt).getTime() < 10 * 60_000;
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ nouveau?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/onboarding");
  if (user.isPlatformAdmin) redirect("/admin");
  if (!user.emailVerified) redirect("/verification-email");
  const sp = await searchParams;
  if (user.memberships.length > 0 && !sp.nouveau && !(await justCreated(user.id))) redirect("/app");
  return (
    <div className="min-h-dvh px-4 py-6 md:px-8">
      <header className="mx-auto mb-8 flex max-w-6xl items-center justify-between">
        <FidelyLogo href="/" />
        <div className="flex items-center gap-3">
          <Badge variant="default">Essai gratuit 14 jours</Badge>
          {user.memberships.length > 0 && <Link href="/app" className="text-sm text-muted hover:text-foreground">Annuler</Link>}
        </div>
      </header>
      <OnboardingWizard ownerName={user.name} allowedTypes={["stamps", "points", "cashback", "tiers"]} />
    </div>
  );
}
