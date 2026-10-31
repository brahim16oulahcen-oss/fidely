"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { signupAction } from "@/app/actions/auth";

const schema = z.object({
  name: z.string().trim().min(2, "Nom requis"),
  email: z.string().trim().email("Adresse email invalide"),
  password: z.string().min(8, "8 caractères minimum").regex(/[A-Za-z]/, "Au moins une lettre").regex(/\d/, "Au moins un chiffre"),
  acceptTerms: z.boolean().refine((v) => v, "Vous devez accepter les conditions d'utilisation"),
});

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", password: "", acceptTerms: false } });
  const e = form.formState.errors;
  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const r = await signupAction(v);
    if (!r.ok) return setError(r.error);
    router.push(r.data.redirectTo);
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert variant="danger">{error}</Alert>}
      <Field label="Votre nom" htmlFor="s-name" error={e.name?.message}><Input id="s-name" autoComplete="name" {...form.register("name")} data-testid="signup-name" /></Field>
      <Field label="Email professionnel" htmlFor="s-email" error={e.email?.message}><Input id="s-email" type="email" autoComplete="email" {...form.register("email")} data-testid="signup-email" /></Field>
      <Field label="Mot de passe" htmlFor="s-pwd" error={e.password?.message} hint="8 caractères minimum, avec au moins une lettre et un chiffre."><Input id="s-pwd" type="password" autoComplete="new-password" {...form.register("password")} data-testid="signup-password" /></Field>
      <label className="flex items-start gap-2.5 text-sm">
        <Checkbox checked={form.watch("acceptTerms")} onCheckedChange={(v) => form.setValue("acceptTerms", v === true, { shouldValidate: true })} aria-label="Accepter les conditions" data-testid="signup-terms" />
        <span>J&apos;accepte les <Link href="/legal/cgu" className="text-primary hover:underline" target="_blank">conditions d&apos;utilisation</Link> et la <Link href="/legal/confidentialite" className="text-primary hover:underline" target="_blank">politique de confidentialité</Link>.</span>
      </label>
      {e.acceptTerms && <p className="text-[13px] text-danger-fg">{e.acceptTerms.message}</p>}
      <Button type="submit" className="w-full" size="lg" loading={form.formState.isSubmitting} data-testid="signup-submit">Créer mon compte</Button>
      <p className="text-center text-xs text-muted">14 jours d&apos;essai gratuit · Sans carte bancaire</p>
    </form>
  );
}
