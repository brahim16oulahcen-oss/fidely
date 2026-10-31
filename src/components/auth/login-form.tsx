"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { loginAction } from "@/app/actions/auth";

const schema = z.object({ email: z.string().trim().email("Adresse email invalide"), password: z.string().min(1, "Mot de passe requis") });

export function LoginForm({ next, demo }: { next?: string; demo: boolean }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const r = await loginAction({ ...v, next });
    if (!r.ok) return setError(r.error);
    toast.success("Connexion réussie.");
    router.push(r.data.redirectTo);
    router.refresh();
  });
  const fill = (email: string) => {
    form.setValue("email", email);
    form.setValue("password", "demo1234");
  };
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert variant="danger">{error}</Alert>}
      <Field label="Email" htmlFor="l-email" error={form.formState.errors.email?.message}><Input id="l-email" type="email" autoComplete="email" {...form.register("email")} /></Field>
      <Field label={<span className="flex w-full justify-between">Mot de passe <Link href="/mot-de-passe-oublie" className="text-xs font-normal text-primary hover:underline">Mot de passe oublié ?</Link></span>} htmlFor="l-pwd" error={form.formState.errors.password?.message}>
        <Input id="l-pwd" type="password" autoComplete="current-password" {...form.register("password")} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={form.formState.isSubmitting}>Se connecter</Button>
      {demo && (
        <div className="rounded-xl border border-dashed border-warning/60 bg-warning-soft/50 p-3 text-sm">
          <p className="font-medium">Comptes de démonstration <span className="font-normal text-muted">(mot de passe : demo1234)</span></p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="outline" onClick={() => fill("julien@demo.fidely.example")}>Commerçant</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => fill("lucas@demo.fidely.example")}>Employé</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => fill("admin@demo.fidely.example")}>Admin</Button>
          </div>
        </div>
      )}
    </form>
  );
}
