import { FidelyLogo } from "@/components/loyalty/fidely-logo";
import { RecoverForm } from "@/components/customer/recover-form";

export const metadata = { title: "Retrouver ma carte" };

export default function RecoverPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col px-5 py-8">
      <FidelyLogo />
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-2xl font-semibold tracking-tight">Retrouver ma carte</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Nouveau téléphone ou lien perdu ? Nous vous renvoyons un lien sécurisé vers votre carte. Aucun mot de passe nécessaire.</p>
        <RecoverForm />
      </div>
    </div>
  );
}
