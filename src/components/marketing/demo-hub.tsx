"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Store, ScanLine, Smartphone, Shield, RotateCcw, ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { switchDemoRoleAction, resetDemoAction } from "@/app/actions/demo";

const ROLES = [
  { id: "merchant", icon: Store, title: "Commerçant", who: "Julien Moreau, Café Rouen Centre", d: "Tableau de bord, clients, programmes, cartes, campagnes et statistiques sur 9 mois d'historique." },
  { id: "staff", icon: ScanLine, title: "Employé en caisse", who: "Lucas Petit, Café Rouen Centre", d: "Le scanner seul : scanner ou rechercher une carte, ajouter un tampon, valider une récompense." },
  { id: "customer", icon: Smartphone, title: "Client final", who: "Léa Martin, 7 tampons", d: "La carte web telle que la voit le client, avec ses récompenses, son historique et ses données." },
  { id: "admin", icon: Shield, title: "Administrateur Fidely", who: "Back-office SaaS", d: "Commerçants, abonnements, revenus, utilisation, support et journaux d'audit." },
] as const;

export function DemoHub() {
  const [pending, start] = React.useTransition();
  const [which, setWhich] = React.useState<string | null>(null);
  const go = (role: (typeof ROLES)[number]["id"]) => {
    setWhich(role);
    start(async () => {
      const r = await switchDemoRoleAction(role);
      if (r && !r.ok) toast.error(r.error);
    });
  };
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        {ROLES.map((r) => (
          <button key={r.id} onClick={() => go(r.id)} disabled={pending} data-testid={`demo-hub-${r.id}`} className="group flex flex-col rounded-2xl border border-border bg-surface p-6 text-left transition-shadow hover:border-primary/50 hover:shadow-lg disabled:opacity-60">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><r.icon className="size-5" /></span>
              <div><p className="font-semibold">{r.title}</p><p className="text-sm text-muted">{r.who}</p></div>
            </div>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{r.d}</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">{pending && which === r.id ? "Ouverture…" : "Ouvrir"} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border p-6 sm:flex-row sm:items-center">
        <Rocket className="size-6 shrink-0 text-primary" />
        <div className="flex-1"><p className="font-semibold">Parcours complet de A à Z</p><p className="text-sm text-muted">Créez votre propre commerce fictif, configurez sa carte, inscrivez un client depuis le QR, puis scannez sa carte jusqu&apos;à la récompense.</p></div>
        <Button asChild><Link href="/inscription">Créer un commerce</Link></Button>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-6 sm:flex-row sm:items-center">
        <div className="flex-1"><p className="font-semibold">Réinitialiser la démo</p><p className="text-sm text-muted">Supprime tout ce qui a été créé ou modifié pendant la démonstration et restaure le jeu de données d&apos;origine. Vous serez déconnecté.</p></div>
        <ConfirmDialog
          title="Réinitialiser la démonstration ?"
          description="Les commerces, clients, passages et campagnes créés pendant la démo seront supprimés. Le jeu de données de départ sera restauré."
          confirmLabel="Réinitialiser"
          destructive
          onConfirm={async () => { const r = await resetDemoAction(); if (r && !r.ok) { toast.error(r.error); return false; } }}
          trigger={<Button variant="outline" data-testid="demo-reset"><RotateCcw /> Réinitialiser la démo</Button>}
        />
      </div>
    </div>
  );
}
