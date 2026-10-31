"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { enrollSchema, type EnrollInput } from "@/features/customers/schemas";
import { staffEnrollAction } from "@/app/actions/merchant";

export function AddCustomerButton({ variant = "tile" }: { variant?: "tile" | "button" }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const form = useForm<EnrollInput>({
    resolver: zodResolver(enrollSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", birthday: "", acceptTerms: undefined as unknown as true, consentEmail: false, consentSms: false },
  });
  const { register, handleSubmit, formState, setValue, watch, setError, reset } = form;
  const onSubmit = handleSubmit(async (values) => {
    const r = await staffEnrollAction(values);
    if (!r.ok) {
      if (r.fieldErrors) Object.entries(r.fieldErrors).forEach(([k, v]) => setError(k as keyof EnrollInput, { message: v }));
      toast.error(r.error);
      return;
    }
    toast.success("Client inscrit. Sa carte digitale est prête.");
    reset();
    setOpen(false);
    router.push(`/app/clients/${r.data.id}`);
  });
  const e = formState.errors;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "tile" ? (
          <button className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left text-sm font-medium shadow-xs transition-colors hover:bg-surface-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary"><UserPlus className="size-4" /></span>
            Ajouter un client
          </button>
        ) : (
          <Button variant="outline"><UserPlus /> Ajouter un client</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inscrire un client en caisse</DialogTitle>
          <DialogDescription>Le client reçoit une carte digitale. Le consentement marketing doit être donné par le client lui-même.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="ac-first" error={e.firstName?.message}><Input id="ac-first" autoComplete="off" {...register("firstName")} aria-invalid={!!e.firstName} /></Field>
            <Field label="Nom" htmlFor="ac-last" error={e.lastName?.message}><Input id="ac-last" autoComplete="off" {...register("lastName")} /></Field>
          </div>
          <Field label="Email" htmlFor="ac-email" error={e.email?.message}><Input id="ac-email" type="email" autoComplete="off" {...register("email")} aria-invalid={!!e.email} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Téléphone (facultatif)" htmlFor="ac-phone" error={e.phone?.message}><Input id="ac-phone" type="tel" {...register("phone")} /></Field>
            <Field label="Anniversaire (MM-JJ)" htmlFor="ac-bday" error={e.birthday?.message}><Input id="ac-bday" placeholder="04-23" {...register("birthday")} /></Field>
          </div>
          <div className="space-y-3 rounded-lg bg-surface-2 p-3 text-sm">
            <label className="flex items-start gap-2.5">
              <Checkbox checked={watch("acceptTerms") === true} onCheckedChange={(v) => setValue("acceptTerms", (v === true) as true, { shouldValidate: true })} aria-label="Le client accepte les conditions du programme" />
              <span>Le client accepte les conditions du programme et la politique de confidentialité.</span>
            </label>
            {e.acceptTerms && <p className="text-[13px] text-danger-fg">{e.acceptTerms.message}</p>}
            <label className="flex items-start gap-2.5">
              <Checkbox checked={watch("consentEmail")} onCheckedChange={(v) => setValue("consentEmail", v === true)} aria-label="Consentement email" />
              <span>Le client accepte de recevoir des offres par email <span className="text-muted">(facultatif)</span></span>
            </label>
            <label className="flex items-start gap-2.5">
              <Checkbox checked={watch("consentSms")} onCheckedChange={(v) => setValue("consentSms", v === true)} aria-label="Consentement SMS" />
              <span>… et par SMS <span className="text-muted">(facultatif)</span></span>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" loading={formState.isSubmitting}>Inscrire le client</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
