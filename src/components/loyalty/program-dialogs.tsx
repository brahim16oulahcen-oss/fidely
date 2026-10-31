"use client";
import * as React from "react";
import { toast } from "sonner";
import { Plus, Lock } from "lucide-react";
import { TYPE_META } from "./program-type-meta";
import type { Program, ProgramRules, ProgramType } from "@/types/domain";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RulesFields } from "./rules-fields";
import { defaultRulesFor, PROGRAM_TYPE_LABEL } from "@/features/loyalty/engine";
import { createProgramAction, setPrimaryProgramAction, setProgramStatusAction, updateProgramAction } from "@/app/actions/merchant";
import { cn } from "@/lib/utils/cn";


export function TypePicker({ value, onChange, allowed }: { value: ProgramType; onChange: (t: ProgramType) => void; allowed: ProgramType[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Type de programme">
      {(Object.keys(TYPE_META) as ProgramType[]).map((t) => {
        const M = TYPE_META[t];
        const ok = allowed.includes(t);
        return (
          <button
            type="button"
            key={t}
            role="radio"
            aria-checked={value === t}
            disabled={!ok}
            onClick={() => onChange(t)}
            data-testid={`type-${t}`}
            className={cn("relative rounded-xl border p-4 text-left transition-all", value === t ? "border-primary bg-primary-soft/60 ring-2 ring-primary/20" : "border-border hover:border-slate-300", !ok && "cursor-not-allowed opacity-50")}
          >
            <M.icon className="size-5 text-primary" />
            <p className="mt-2 font-medium">{PROGRAM_TYPE_LABEL[t]}</p>
            <p className="mt-0.5 text-xs text-muted">{M.description}</p>
            <p className="mt-2 text-xs font-medium text-foreground/80">{M.example}</p>
            {!ok && <span className="absolute right-3 top-3 inline-flex items-center gap-1 text-[11px] text-muted"><Lock className="size-3" /> Offre supérieure</span>}
          </button>
        );
      })}
    </div>
  );
}

export function ProgramFormDialog({ program, allowedTypes, trigger }: { program?: Program; allowedTypes: ProgramType[]; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(program?.name ?? "");
  const [rules, setRules] = React.useState<ProgramRules>(program?.rules ?? defaultRulesFor(allowedTypes[0] ?? "stamps"));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();
  const submit = () =>
    start(async () => {
      const r = program ? await updateProgramAction(program.id, { name, rules }) : await createProgramAction({ name, rules });
      if (r.ok) {
        toast.success(r.message ?? "Enregistré.");
        setOpen(false);
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
      }
    });
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o && !program) { setName(""); setRules(defaultRulesFor(allowedTypes[0] ?? "stamps")); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{program ? `Modifier « ${program.name} »` : "Créer un programme"}</DialogTitle>
          <DialogDescription>{program ? "Les nouvelles règles s'appliquent aux prochains passages. L'historique n'est jamais recalculé." : "Choisissez un mécanisme puis définissez ses règles."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {!program && <TypePicker value={rules.type} onChange={(t) => setRules(defaultRulesFor(t))} allowed={allowedTypes} />}
          <Field label="Nom du programme" htmlFor="p-name" error={errors.name}>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Carte Café" />
          </Field>
          <RulesFields value={rules} onChange={setRules} errors={errors} />
          {program && <Alert variant="info">Version actuelle des règles : v{program.ruleVersion}. Un enregistrement avec des règles modifiées créera la v{program.ruleVersion + 1}.</Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} loading={pending}>{program ? "Enregistrer" : <><Plus /> Créer le programme</>}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProgramStatusToggle({ program, isPrimary }: { program: Program; isPrimary: boolean }) {
  const [confirm, setConfirm] = React.useState(false);
  const [pending, start] = React.useTransition();
  const active = program.status === "active";
  return (
    <div className="flex items-center gap-2">
      <Switch checked={active} disabled={pending} onCheckedChange={() => (active ? setConfirm(true) : start(async () => { const r = await setProgramStatusAction(program.id, true); r.ok ? toast.success(r.message) : toast.error(r.error); }))} aria-label={active ? "Désactiver le programme" : "Activer le programme"} />
      <span className="text-sm text-muted">{active ? "Actif" : "Inactif"}</span>
      {active && !isPrimary && (
        <Button size="sm" variant="ghost" onClick={() => start(async () => { const r = await setPrimaryProgramAction(program.id); r.ok ? toast.success(r.message) : toast.error(r.error); })}>Utiliser pour les inscriptions</Button>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Désactiver ce programme ?"
        description="Plus aucun tampon ni point ne pourra être attribué. Les soldes et récompenses existants sont conservés et redeviendront utilisables si vous le réactivez."
        confirmLabel="Désactiver"
        destructive
        onConfirm={async () => {
          const r = await setProgramStatusAction(program.id, false);
          r.ok ? toast.success(r.message) : toast.error(r.error);
        }}
      />
    </div>
  );
}
