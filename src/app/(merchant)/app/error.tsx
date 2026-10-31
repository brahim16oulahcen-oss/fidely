"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MerchantError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const auth = /Session|connecter/.test(error.message);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-danger-soft text-danger-fg"><AlertTriangle className="size-6" /></span>
      <h1 className="text-lg font-semibold">{auth ? "Votre session a expiré" : "Cette page n'a pas pu être chargée"}</h1>
      <p className="mt-1 text-sm text-muted">{auth ? "Reconnectez-vous pour continuer." : "Une erreur inattendue est survenue. Vos données n'ont pas été modifiées."}</p>
      <div className="mt-6 flex gap-2">
        {auth ? <Button asChild><a href="/connexion">Se reconnecter</a></Button> : <Button onClick={reset}>Réessayer</Button>}
      </div>
    </div>
  );
}
