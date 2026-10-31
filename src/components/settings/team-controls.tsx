"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { changeMemberRoleAction, inviteMemberAction, removeMemberAction } from "@/app/actions/merchant";

const schema = z.object({ name: z.string().trim().min(2, "Nom requis"), email: z.string().trim().email("Email invalide"), role: z.enum(["manager", "staff"]) });

export function InviteMemberDialog({ disabled, demo }: { disabled?: boolean; demo: boolean }) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", role: "staff" } });
  const onSubmit = form.handleSubmit(async (v) => {
    const r = await inviteMemberAction(v);
    if (r.ok) {
      toast.success(demo ? `Membre ajouté. Invitation simulée — mot de passe démo : demo1234` : "Invitation envoyée.");
      form.reset();
      setOpen(false);
    } else toast.error(r.error);
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button disabled={disabled}><UserPlus /> Inviter un membre</Button></DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader><DialogTitle>Inviter un membre</DialogTitle><DialogDescription>Un employé peut scanner les cartes et valider les récompenses. Un responsable peut aussi gérer les programmes et campagnes.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Nom" htmlFor="tm-name" error={form.formState.errors.name?.message}><Input id="tm-name" {...form.register("name")} /></Field>
          <Field label="Email" htmlFor="tm-email" error={form.formState.errors.email?.message}><Input id="tm-email" type="email" {...form.register("email")} /></Field>
          <Field label="Rôle" htmlFor="tm-role"><NativeSelect id="tm-role" {...form.register("role")}><option value="staff">Employé</option><option value="manager">Responsable</option></NativeSelect></Field>
          {demo && <Alert variant="demo">Invitation simulée : aucun email n&apos;est envoyé. Le compte est créé avec le mot de passe de démonstration.</Alert>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" loading={form.formState.isSubmitting}>Inviter</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MemberRoleSelect({ userId, role }: { userId: string; role: "manager" | "staff" }) {
  const [pending, start] = React.useTransition();
  return (
    <NativeSelect className="h-9 w-40" value={role} disabled={pending} aria-label="Rôle" onChange={(e) => start(async () => { const r = await changeMemberRoleAction(userId, e.target.value as "manager" | "staff"); r.ok ? toast.success(r.message) : toast.error(r.error); })}>
      <option value="staff">Employé</option>
      <option value="manager">Responsable</option>
    </NativeSelect>
  );
}

export function RemoveMemberButton({ userId, name }: { userId: string; name: string }) {
  return (
    <ConfirmDialog
      title={`Retirer ${name} de l'équipe ?`}
      description="Cette personne perdra immédiatement l'accès au scanner et au tableau de bord de ce commerce. L'historique de ses opérations est conservé."
      confirmLabel="Retirer"
      destructive
      onConfirm={async () => { const r = await removeMemberAction(userId); r.ok ? toast.success(r.message) : toast.error(r.error); }}
      trigger={<Button variant="ghost" size="icon-sm" aria-label={`Retirer ${name}`}><Trash2 /></Button>}
    />
  );
}
