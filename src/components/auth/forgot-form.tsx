"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { forgotPasswordAction, resetPasswordAction } from "@/app/actions/auth";

export function ForgotForm() {
  const [email, setEmail] = React.useState("");
  const [done, setDone] = React.useState<{ demoLink: string | null } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  if (done)
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Demande enregistrée">Si un compte existe pour cette adresse, un lien de réinitialisation valable 30 minutes vient d&apos;être envoyé.</Alert>
        {done.demoLink && (
          <div className="rounded-xl border border-dashed border-warning/60 bg-warning-soft/60 p-4 text-sm">
            <p className="font-medium">Boîte mail simulée — mode démo</p>
            <Link href={done.demoLink} className="mt-1 inline-block text-primary underline">Réinitialiser mon mot de passe</Link>
          </div>
        )}
      </div>
    );
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await forgotPasswordAction(email); r.ok ? setDone(r.data) : setError(r.error); }); }}>
      {error && <Alert variant="danger">{error}</Alert>}
      <Field label="Email" htmlFor="f-email"><Input id="f-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>Recevoir un lien</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [pwd, setPwd] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await resetPasswordAction(token, pwd); if (r.ok) { toast.success(r.message); router.push("/connexion"); } else setError(r.error); }); }}>
      {error && <Alert variant="danger">{error}</Alert>}
      <Field label="Nouveau mot de passe" htmlFor="r-pwd" hint="8 caractères minimum, avec une lettre et un chiffre."><Input id="r-pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" /></Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>Enregistrer</Button>
    </form>
  );
}
