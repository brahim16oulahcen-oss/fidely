"use client";
import * as React from "react";
import { Apple, Smartphone, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface WalletStatus {
  id: "apple" | "google";
  label: string;
  configured: boolean;
  missing: string[];
}

const PREREQS: Record<WalletStatus["id"], string[]> = {
  apple: [
    "Compte Apple Developer Program (99 $/an)",
    "Identifiant Pass Type ID (pass.com.votreentreprise.fidelite)",
    "Certificat de signature .p12 + certificat Apple WWDR",
    "Service web de mise à jour des passes (APNs) pour actualiser le solde",
  ],
  google: [
    "Compte émetteur Google Wallet (Google Pay & Wallet Console)",
    "Projet Google Cloud avec l'API Google Wallet activée",
    "Compte de service et clé JSON",
    "Classe de fidélité (LoyaltyClass) validée par Google",
  ],
};

/** Les boutons d'ajout aux Wallets affichent explicitement l'état « Intégration à configurer ». */
export function WalletButtons({ statuses, compact }: { statuses: WalletStatus[]; compact?: boolean }) {
  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"}>
      {statuses.map((s) => (
        <Dialog key={s.id}>
          <DialogTrigger asChild>
            <Button variant="night" className="justify-start" data-testid={`wallet-${s.id}`}>
              {s.id === "apple" ? <Apple /> : <Smartphone />}
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[10px] font-normal opacity-70">Ajouter à</span>
                <span className="text-sm">{s.label}</span>
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{s.label} <Badge variant={s.configured ? "success" : "warning"}>{s.configured ? "Configuré" : "Intégration à configurer"}</Badge></DialogTitle>
              <DialogDescription>
                {s.configured
                  ? "Les identifiants sont présents, mais la génération du pass n'est pas encore implémentée dans ce prototype."
                  : "Ce prototype ne génère pas de pass officiel : cela exige des certificats et un compte émetteur. La carte web fonctionne en attendant, avec le même QR code."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-2 font-medium">Prérequis production</p>
                <ul className="list-disc space-y-1 pl-5 text-muted">{PREREQS[s.id].map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
              {s.missing.length > 0 && (
                <div className="rounded-lg bg-surface-2 p-3">
                  <p className="mb-1 flex items-center gap-1.5 font-medium"><AlertCircle className="size-4 text-warning-fg" /> Variables manquantes</p>
                  <ul className="font-mono text-xs text-muted">{s.missing.map((m) => <li key={m}>{m}</li>)}</ul>
                </div>
              )}
              <p className="text-muted">Documentation : <code className="rounded bg-surface-2 px-1">docs/WALLET.md</code></p>
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
