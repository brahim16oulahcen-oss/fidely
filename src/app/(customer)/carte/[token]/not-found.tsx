import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CardNotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold">Carte introuvable</h1>
      <p className="mt-2 text-sm text-muted">Ce lien n&apos;est plus valide (carte supprimée ou lien incomplet).</p>
      <Button asChild className="mt-6"><Link href="/retrouver-ma-carte">Retrouver ma carte</Link></Button>
    </div>
  );
}
