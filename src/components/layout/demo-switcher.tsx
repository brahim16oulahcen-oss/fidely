"use client";
import * as React from "react";
import Link from "next/link";
import { FlaskConical, Shield, Store, ScanLine, Smartphone, RotateCcw, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { switchDemoRoleAction, resetDemoAction } from "@/app/actions/demo";

const ROLES = [
  { id: "merchant", label: "Commerçant", hint: "Julien · Café Rouen Centre", icon: Store },
  { id: "staff", label: "Employé", hint: "Lucas · scanner en caisse", icon: ScanLine },
  { id: "customer", label: "Client final", hint: "Léa · carte digitale", icon: Smartphone },
  { id: "admin", label: "Administrateur SaaS", hint: "Back-office Fidely", icon: Shield },
] as const;

export function DemoSwitcher() {
  const [pending, start] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);

  const go = (role: (typeof ROLES)[number]["id"]) =>
    start(async () => {
      const r = await switchDemoRoleAction(role);
      if (r && !r.ok) toast.error(r.error);
      setOpen(false);
    });

  return (
    <div className="no-print fixed bottom-4 left-4 z-40">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full border border-warning/50 bg-[#111827] px-3.5 py-2 text-xs font-medium text-white shadow-lg hover:bg-[#1f2937]"
            aria-label="Ouvrir le sélecteur du mode démonstration"
            data-testid="demo-switcher"
          >
            <FlaskConical className="size-3.5 text-warning" />
            Mode démo
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="top" className="w-72 p-2">
          <div className="px-2 pb-2 pt-1">
            <p className="text-sm font-semibold">Changer de profil</p>
            <p className="text-xs text-muted">Données fictives uniquement. Indisponible hors mode démo.</p>
          </div>
          <div className="space-y-0.5">
            {ROLES.map((r) => (
              <button
                key={r.id}
                disabled={pending}
                onClick={() => go(r.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2 disabled:opacity-50"
                data-testid={`demo-role-${r.id}`}
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <r.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{r.label}</span>
                  <span className="block truncate text-xs text-muted">{r.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border px-1 pt-2">
            <Link href="/demo" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft">
              Guide de démo <ArrowUpRight className="size-3" />
            </Link>
            <button onClick={() => setConfirm(true)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-danger-fg hover:bg-danger-soft">
              <RotateCcw className="size-3" /> Réinitialiser la démo
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Réinitialiser la démonstration ?"
        description="Toutes les modifications (commerces créés, clients, passages, campagnes) seront effacées et le jeu de données fictif d'origine sera régénéré. Vous serez déconnecté."
        confirmLabel="Réinitialiser"
        destructive
        onConfirm={async () => {
          const r = await resetDemoAction();
          if (r && !r.ok) toast.error(r.error);
        }}
      />
    </div>
  );
}
