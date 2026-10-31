"use client";
import * as React from "react";
import { toast } from "sonner";
import { Play, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea, NativeSelect } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cancelCampaignAction, previewAutomationAction, runAutomationAction, sendCampaignNowAction, updateAutomationAction } from "@/app/actions/campaigns";
import type { Channel } from "@/types/domain";

export function CampaignRowActions({ id, status }: { id: string; status: string }) {
  if (status === "sent" || status === "cancelled") return null;
  return (
    <div className="flex justify-end gap-1">
      <ConfirmDialog
        title="Lancer la simulation d'envoi ?"
        description="Les messages seront inscrits au journal interne pour les clients ayant consenti. Aucun envoi réel."
        confirmLabel="Simuler l'envoi"
        onConfirm={async () => {
          const r = await sendCampaignNowAction(id);
          r.ok ? toast.success(`Simulation : ${r.data.sent} messages journalisés, ${r.data.excluded} exclus (sans consentement).`) : toast.error(r.error);
        }}
        trigger={<Button size="sm" variant="outline">Envoyer</Button>}
      />
      <ConfirmDialog
        title="Annuler cette campagne ?"
        confirmLabel="Annuler la campagne"
        destructive
        onConfirm={async () => {
          const r = await cancelCampaignAction(id);
          r.ok ? toast.success(r.message) : toast.error(r.error);
        }}
        trigger={<Button size="sm" variant="ghost">Annuler</Button>}
      />
    </div>
  );
}

export function AutomationCard({ id, title, description, enabled, channel, message, lastRunAt }: { id: string; title: string; description: string; enabled: boolean; channel: Channel; message: string; lastRunAt?: string }) {
  const [state, setState] = React.useState({ enabled, channel, message });
  const [preview, setPreview] = React.useState<{ eligible: number; consenting: number } | null>(null);
  const [pending, start] = React.useTransition();
  const dirty = state.enabled !== enabled || state.channel !== channel || state.message !== message;
  const save = (next = state) =>
    start(async () => {
      const r = await updateAutomationAction(id, next);
      r.ok ? toast.success(r.message) : toast.error(r.error);
    });
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <Switch checked={state.enabled} onCheckedChange={(v) => { const n = { ...state, enabled: v }; setState(n); save(n); }} aria-label={`Activer : ${title}`} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr]">
        <NativeSelect value={state.channel} onChange={(e) => setState({ ...state, channel: e.target.value as Channel })} aria-label="Canal">
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="wallet">Notification Wallet</option>
        </NativeSelect>
        <Textarea value={state.message} onChange={(e) => setState({ ...state, message: e.target.value })} className="min-h-16" aria-label="Message" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {dirty && <Button size="sm" onClick={() => save()} loading={pending}>Enregistrer</Button>}
        <Button size="sm" variant="outline" onClick={() => start(async () => { const r = await previewAutomationAction(id); r.ok ? setPreview(r.data) : toast.error(r.error); })}><Eye /> Qui est concerné aujourd&apos;hui ?</Button>
        <ConfirmDialog
          title="Exécuter maintenant (simulation) ?"
          description="Les clients éligibles et consentants recevront un message simulé, inscrit au journal. En production, cette tâche tourne automatiquement chaque jour."
          confirmLabel="Exécuter"
          onConfirm={async () => {
            const r = await runAutomationAction(id);
            r.ok ? toast.success(`Simulation : ${r.data.sent} messages journalisés, ${r.data.excluded} exclus.`) : toast.error(r.error);
          }}
          trigger={<Button size="sm" variant="ghost" disabled={!state.enabled}><Play /> Exécuter maintenant</Button>}
        />
        {preview && <span className="text-xs text-muted">{preview.eligible} éligible{preview.eligible > 1 ? "s" : ""} · {preview.consenting} avec consentement</span>}
        {lastRunAt && <span className="ml-auto text-xs text-muted">Dernière exécution : {new Date(lastRunAt).toLocaleString("fr-FR")}</span>}
      </div>
    </div>
  );
}
