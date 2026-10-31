"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { addStoreAction, updateBrandingAction, updateSettingsAction } from "@/app/actions/merchant";
import { ColorField } from "@/components/wallet/card-editor";
import { LOGO_ICONS, MerchantLogo } from "@/components/loyalty/merchant-logo";
import { cn } from "@/lib/utils/cn";

const schema = z.object({
  name: z.string().trim().min(2, "Nom requis"),
  description: z.string().max(160),
  address: z.string().trim().min(3, "Adresse requise"),
  postalCode: z.string().regex(/^\d{5}$/, "Code postal à 5 chiffres"),
  city: z.string().trim().min(2),
  phone: z.string().max(20),
  email: z.string().email("Email invalide"),
  siret: z.string().regex(/^(\d{14})?$/, "SIRET à 14 chiffres").optional(),
  minSecondsBetweenVisits: z.coerce.number().int().min(0).max(86400),
  maxAmount: z.coerce.number().min(10).max(100000),
  retentionMonths: z.coerce.number().int().min(6).max(60),
  attributionPct: z.coerce.number().min(0).max(100),
});
type Values = z.input<typeof schema>;

export function SettingsForm({ initial }: { initial: Values }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial });
  const e = form.formState.errors;
  const onSubmit = form.handleSubmit(async (v) => {
    const parsed = schema.parse(v);
    const r = await updateSettingsAction({ ...parsed, maxAmountCents: Math.round(parsed.maxAmount * 100), attributionRate: parsed.attributionPct / 100 });
    r.ok ? toast.success(r.message) : toast.error(r.error);
    if (r.ok) form.reset(v);
  });
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du commerce" htmlFor="s-name" error={e.name?.message}><Input id="s-name" {...form.register("name")} /></Field>
        <Field label="Email de contact" htmlFor="s-email" error={e.email?.message}><Input id="s-email" type="email" {...form.register("email")} /></Field>
        <Field label="Description" htmlFor="s-desc" className="sm:col-span-2"><Textarea id="s-desc" {...form.register("description")} className="min-h-16" /></Field>
        <Field label="Adresse" htmlFor="s-addr" error={e.address?.message}><Input id="s-addr" {...form.register("address")} /></Field>
        <div className="grid grid-cols-[120px_1fr] gap-3">
          <Field label="Code postal" htmlFor="s-cp" error={e.postalCode?.message}><Input id="s-cp" {...form.register("postalCode")} /></Field>
          <Field label="Ville" htmlFor="s-city"><Input id="s-city" {...form.register("city")} /></Field>
        </div>
        <Field label="Téléphone" htmlFor="s-phone"><Input id="s-phone" {...form.register("phone")} /></Field>
        <Field label="SIRET" htmlFor="s-siret" error={e.siret?.message}><Input id="s-siret" {...form.register("siret")} placeholder="14 chiffres" /></Field>
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold">Sécurité et anti-fraude</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Délai minimum entre deux passages (secondes)" htmlFor="s-gap" hint="Empêche les doubles attributions involontaires ou abusives." error={e.minSecondsBetweenVisits?.message}><Input id="s-gap" type="number" {...form.register("minSecondsBetweenVisits")} /></Field>
          <Field label="Montant maximal par opération (€)" htmlFor="s-max" hint="Au-delà, l'attribution est refusée." error={e.maxAmount?.message}><Input id="s-max" type="number" {...form.register("maxAmount")} /></Field>
        </div>
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold">Données et statistiques</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Conservation des données clients inactifs (mois)" htmlFor="s-ret" hint="Durée après la dernière visite. Recommandation CNIL : 3 ans maximum." error={e.retentionMonths?.message}><Input id="s-ret" type="number" {...form.register("retentionMonths")} /></Field>
          <Field label="Taux d'attribution du CA additionnel (%)" htmlFor="s-attr" hint="Hypothèse utilisée pour l'estimation affichée dans Analytics." error={e.attributionPct?.message}><Input id="s-attr" type="number" {...form.register("attributionPct")} /></Field>
        </div>
      </section>
      <Button type="submit" loading={form.formState.isSubmitting} disabled={!form.formState.isDirty}>Enregistrer les paramètres</Button>
    </form>
  );
}

export function BrandingForm({ initial, name }: { initial: { icon: string; primary: string; text: string; accent: string }; name: string }) {
  const [v, setV] = React.useState(initial);
  const [pending, start] = React.useTransition();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <MerchantLogo icon={v.icon} background={v.primary} color={v.text} name={name} className="size-14 rounded-2xl" />
        <p className="text-sm text-muted">Logo et couleurs utilisés par défaut sur vos cartes et affiches.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Icône">
        {Object.entries(LOGO_ICONS).map(([k, Icon]) => (
          <button key={k} type="button" role="radio" aria-checked={v.icon === k} aria-label={k} onClick={() => setV({ ...v, icon: k })} className={cn("flex size-10 items-center justify-center rounded-lg border", v.icon === k ? "border-primary bg-primary-soft text-primary" : "border-border text-muted hover:text-foreground")}>
            <Icon className="size-5" />
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <ColorField id="b-p" label="Principale" value={v.primary} onChange={(c) => setV({ ...v, primary: c })} />
        <ColorField id="b-t" label="Texte" value={v.text} onChange={(c) => setV({ ...v, text: c })} />
        <ColorField id="b-a" label="Accent" value={v.accent} onChange={(c) => setV({ ...v, accent: c })} />
      </div>
      <Button loading={pending} disabled={JSON.stringify(v) === JSON.stringify(initial)} onClick={() => start(async () => { const r = await updateBrandingAction(v); r.ok ? toast.success(r.message) : toast.error(r.error); })}>Enregistrer l&apos;identité</Button>
    </div>
  );
}

export function AddStoreDialog({ disabled, reason }: { disabled: boolean; reason?: string }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [pending, start] = React.useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" disabled={disabled} title={reason}><Plus /> Ajouter un établissement</Button></DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader><DialogTitle>Nouvel établissement</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Nom" htmlFor="st-name"><Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Adresse" htmlFor="st-addr"><Input id="st-addr" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button loading={pending} onClick={() => start(async () => { const r = await addStoreAction({ name, address }); if (r.ok) { toast.success(r.message); setOpen(false); setName(""); setAddress(""); } else toast.error(r.error); })}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
