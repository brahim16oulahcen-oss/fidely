import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FidelyLogo } from "@/components/loyalty/fidely-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <FidelyLogo />
      <h1 className="mt-6 text-2xl font-semibold">Page introuvable</h1>
      <p className="max-w-sm text-sm text-muted">Le lien est peut-être incomplet ou la page a été déplacée.</p>
      <div className="flex gap-2"><Button asChild><Link href="/">Accueil</Link></Button><Button variant="outline" asChild><Link href="/demo">Démonstration</Link></Button></div>
    </div>
  );
}
