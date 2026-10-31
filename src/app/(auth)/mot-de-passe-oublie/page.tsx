import Link from "next/link";
import { ForgotForm, ResetForm } from "@/components/auth/forgot-form";

export const metadata = { title: "Mot de passe oublié" };

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">{token ? "Nouveau mot de passe" : "Mot de passe oublié"}</h1>
      <p className="mb-6 mt-1 text-sm text-muted">{token ? "Choisissez un nouveau mot de passe." : "Indiquez votre email, nous vous envoyons un lien de réinitialisation."}</p>
      {token ? <ResetForm token={token} /> : <ForgotForm />}
      <p className="mt-6 text-center text-sm"><Link href="/connexion" className="text-primary hover:underline">Retour à la connexion</Link></p>
    </div>
  );
}
