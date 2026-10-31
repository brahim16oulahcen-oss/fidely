import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = { title: "Essai gratuit" };

export default function SignupPage() {
  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Lancez votre carte de fidélité</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Votre programme est prêt en 5 minutes.</p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted">Déjà client ? <Link href="/connexion" className="font-medium text-primary hover:underline">Se connecter</Link></p>
    </div>
  );
}
