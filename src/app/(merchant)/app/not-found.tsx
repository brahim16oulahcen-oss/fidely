import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 text-xl font-semibold">Élément introuvable</h1>
      <p className="mt-1 text-sm text-muted">Il a peut-être été supprimé, ou il appartient à un autre commerce.</p>
      <Button asChild className="mt-6"><Link href="/app">Retour au tableau de bord</Link></Button>
    </div>
  );
}
