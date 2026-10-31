"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { rewardInputSchema } from "@/features/loyalty/schemas";
import { setRewardActiveAction, upsertRewardAction } from "@/app/actions/merchant";
import type { Reward } from "@/types/domain";

type FormValues = z.input<typeof rewardInputSchema>;

export function RewardFormDialog({ reward, programs, trigger }: { reward?: Reward; programs: { id: string; name: string; type: string }[]; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [unlimited, setUnlimited] = React.useState(reward ? reward.quantity === null : true);
  const form = useForm<FormValues>({
    resolver: zodResolver(rewardInputSchema),
    defaultValues: reward
      ? { programId: reward.programId, name: reward.name, description: reward.description, cost: reward.cost, validityDays: reward.validityDays, quantity: reward.quantity, active: reward.active, autoUnlock: reward.autoUnlock }
      : { programId: programs[0]?.id, name: "", description: "", cost: 100, validityDays: 60, quantity: null, active: true, autoUnlock: false },
  });
  const { register, handleSubmit, formState, watch, setValue } = form;
  const programType = programs.find((p) => p.id === watch("programId"))?.type;
  const onSubmit = handleSubmit(async (values) => {
    const r = await upsertRewardAction(reward?.id ?? null, { ...values, quantity: unlimited ? null : values.quantity });
    if (r.ok) {
      toast.success(r.message);
      setOpen(false);
      if (!reward) form.reset();
    } else toast.error(r.error);
  });
  const e = formState.errors;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reward ? "Modifier la récompense" : "Nouvelle récompense"}</DialogTitle>
          <DialogDescription>
            {programType === "stamps" ? "Pour un programme à tampons, le coût correspond au nombre de passages. Une récompense à 0 est un cadeau attribué manuellement (ex. anniversaire)." : programType === "cashback" ? "Pour un programme cashback, les récompenses sont des cadeaux (coût 0)." : "Le coût est exprimé en points."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {programs.length > 1 && !reward && (
            <Field label="Programme" htmlFor="rw-prog"><NativeSelect id="rw-prog" {...register("programId")}>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</NativeSelect></Field>
          )}
          <Field label="Nom" htmlFor="rw-name" error={e.name?.message}><Input id="rw-name" {...register("name")} placeholder="Ex. Café offert" /></Field>
          <Field label="Description" htmlFor="rw-desc" error={e.description?.message}><Textarea id="rw-desc" {...register("description")} className="min-h-16" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={programType === "stamps" ? "Coût (passages)" : "Coût (points)"} htmlFor="rw-cost" error={e.cost?.message}><Input id="rw-cost" type="number" min={0} {...register("cost")} /></Field>
            <Field label="Validité après déblocage (jours)" htmlFor="rw-val" error={e.validityDays?.message}><Input id="rw-val" type="number" min={1} {...register("validityDays")} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">Quantité illimitée <Switch checked={unlimited} onCheckedChange={setUnlimited} /></label>
            {!unlimited && <Field label="Quantité disponible" htmlFor="rw-qty" error={e.quantity?.message}><Input id="rw-qty" type="number" min={1} {...register("quantity")} /></Field>}
          </div>
          <label className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
            <span>Déblocage automatique<span className="block text-xs text-muted">Débloquée dès que le solde atteint le coût (les points sont alors réservés).</span></span>
            <Switch checked={watch("autoUnlock")} onCheckedChange={(v) => setValue("autoUnlock", v)} />
          </label>
          <label className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">Récompense active <Switch checked={watch("active")} onCheckedChange={(v) => setValue("active", v)} /></label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" loading={formState.isSubmitting}>{reward ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RewardActiveSwitch({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = React.useTransition();
  return (
    <Switch
      checked={active}
      disabled={pending}
      aria-label={active ? "Désactiver la récompense" : "Activer la récompense"}
      onCheckedChange={(v) => start(async () => { const r = await setRewardActiveAction(id, v); r.ok ? toast.success(r.message) : toast.error(r.error); })}
    />
  );
}
