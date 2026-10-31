"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { enrollSchema, type EnrollInput } from "@/features/customers/schemas";
import { enrollAction } from "@/app/actions/customer";

export function JoinForm({ slug, merchantName, source, accent }: { slug: string; merchantName: string; source: "qr" | "web"; accent: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [more, setMore] = React.useState(false);
  const form = useForm<EnrollInput>({ resolver: zodResolver(enrollSchema), defaultValues: { firstName: "", lastName: "", email: "", phone: "", birthday: "", acceptTerms: false as unknown as true, consentEmail: false, consentSms: false } });
  const e = form.formState.errors;
  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const r = await enrollAction(slug, v, source);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.push(`/carte/${r.data.token}?bienvenue=1`);
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <Alert variant="danger" action={/existe déjà/.test(error) ? <Button size="sm" variant="outline" asChild><Link href="/retrouver-ma-carte">Retrouver</Link></Button> : undefined}>{error}</Alert>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" htmlFor="j-first" error={e.firstName?.message}><Input id="j-first" autoComplete="given-name" className="h-12 text-base" {...form.register("firstName")} data-testid="join-firstname" /></Field>
        <Field label="Nom" htmlFor="j-last" error={e.lastName?.message}><Input id="j-last" autoComplete="family-name" className="h-12 text-base" {...form.register("lastName")} data-testid="join-lastname" /></Field>
      </div>
      <Field label="Email" htmlFor="j-email" error={e.email?.message} hint="Pour retrouver votre carte si vous changez de téléphone."><Input id="j-email" type="email" autoComplete="email" inputMode="email" className="h-12 text-base" {...form.register("email")} data-testid="join-email" /></Field>
      <button type="button" onClick={() => setMore(!more)} className="flex items-center gap-1 text-sm text-muted" aria-expanded={more}>
        <ChevronDown className={`size-4 transition-transform ${more ? "rotate-180" : ""}`} /> Téléphone et anniversaire (facultatif)
      </button>
      {more && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Téléphone" htmlFor="j-phone" error={e.phone?.message}><Input id="j-phone" type="tel" autoComplete="tel" className="h-12 text-base" {...form.register("phone")} /></Field>
          <Field label="Anniversaire" htmlFor="j-bday" error={e.birthday?.message} hint="MM-JJ"><Input id="j-bday" placeholder="04-23" className="h-12 text-base" {...form.register("birthday")} /></Field>
        </div>
      )}
      <div className="space-y-3 rounded-xl bg-surface-2 p-4 text-sm">
        <label className="flex items-start gap-3">
          <Checkbox className="mt-0.5" checked={form.watch("acceptTerms") === true} onCheckedChange={(v) => form.setValue("acceptTerms", (v === true) as true, { shouldValidate: true })} aria-label="Accepter les conditions du programme" data-testid="join-terms" />
          <span>J&apos;adhère au programme de fidélité de {merchantName} et j&apos;accepte ses <Link href="/legal/conditions-programme" target="_blank" className="underline">conditions</Link>. Mes données sont traitées selon la <Link href="/legal/confidentialite" target="_blank" className="underline">politique de confidentialité</Link>.</span>
        </label>
        {e.acceptTerms && <p className="text-[13px] text-danger-fg">{e.acceptTerms.message}</p>}
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Facultatif — offres et actualités</p>
          <label className="flex items-start gap-3"><Checkbox className="mt-0.5" checked={form.watch("consentEmail")} onCheckedChange={(v) => form.setValue("consentEmail", v === true)} aria-label="Recevoir les offres par email" /><span>Je souhaite recevoir les offres de {merchantName} par email</span></label>
          <label className="mt-2 flex items-start gap-3"><Checkbox className="mt-0.5" checked={form.watch("consentSms")} onCheckedChange={(v) => form.setValue("consentSms", v === true)} aria-label="Recevoir les offres par SMS" /><span>… et par SMS</span></label>
          <p className="mt-2 text-xs text-muted">Votre carte fonctionne sans ces consentements. Vous pouvez les retirer à tout moment.</p>
        </div>
      </div>
      <Button type="submit" size="xl" className="w-full text-white" style={{ background: accent }} loading={form.formState.isSubmitting} data-testid="join-submit">Obtenir ma carte</Button>
    </form>
  );
}
