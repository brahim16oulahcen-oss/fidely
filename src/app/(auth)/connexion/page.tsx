import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { env } from "@/config/env";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Bon retour parmi nous</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Connectez-vous à votre espace commerçant.</p>
      <LoginForm next={next} demo={env.demoMode} />
      <p className="mt-6 text-center text-sm text-muted">Pas encore de compte ? <Link href="/inscription" className="font-medium text-primary hover:underline">Essayer gratuitement</Link></p>
    </div>
  );
}
