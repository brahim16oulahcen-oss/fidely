"use client";
import * as React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { recoverCardAction } from "@/app/actions/customer";

export function RecoverForm() {
  const [email, setEmail] = React.useState("");
  const [result, setResult] = React.useState<{ demoOutbox: { merchantName: string; url: string }[] | null } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  if (result)
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Demande envoyée">Si une carte est associée à cette adresse, vous allez recevoir un email avec un lien sécurisé.</Alert>
        {result.demoOutbox && (
          <div className="rounded-xl border border-dashed border-warning/60 bg-warning-soft/60 p-4 text-sm" data-testid="recover-outbox">
            <p className="font-medium">Boîte mail simulée — mode démo</p>
            {result.demoOutbox.length === 0 ? <p className="mt-1 text-muted">Aucun email ne serait envoyé : aucune carte pour cette adresse.</p> : (
              <ul className="mt-2 space-y-1">{result.demoOutbox.map((c) => <li key={c.url}><Link className="text-primary underline" href={c.url}>Ma carte {c.merchantName}</Link></li>)}</ul>
            )}
          </div>
        )}
      </div>
    );
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await recoverCardAction(email); r.ok ? setResult(r.data) : setError(r.error); }); }}>
      {error && <Alert variant="danger">{error}</Alert>}
      <Field label="Email utilisé lors de l'inscription" htmlFor="rc-email"><Input id="rc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" required /></Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>Recevoir le lien de ma carte</Button>
    </form>
  );
}
