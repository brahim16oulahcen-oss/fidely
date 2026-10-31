import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/context";
import { VerifyForm } from "@/components/auth/verify-form";
import { env } from "@/config/env";

export const metadata = { title: "Vérification de l'email" };
export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (user.emailVerified) redirect(user.memberships.length ? "/app" : "/onboarding");
  return (
    <div className="w-full max-w-sm">
      <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary"><MailCheck className="size-6" /></span>
      <h1 className="text-2xl font-semibold tracking-tight">Vérifiez votre email</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Saisissez le code à 6 chiffres envoyé à <strong className="text-foreground">{user.email}</strong>.</p>
      {env.demoMode && (
        <div className="mb-5 rounded-xl border border-dashed border-warning/60 bg-warning-soft/60 p-4 text-sm" data-testid="demo-inbox">
          <p className="font-medium">Boîte mail simulée — mode démo</p>
          <p className="mt-1 text-muted">Aucun email n&apos;est réellement envoyé. Votre code :</p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-[0.3em]" data-testid="demo-code">{user.verificationCode}</p>
        </div>
      )}
      <VerifyForm />
    </div>
  );
}
