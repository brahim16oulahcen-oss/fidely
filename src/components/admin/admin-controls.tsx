"use client";
import * as React from "react";
import { toast } from "sonner";
import { Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, NativeSelect } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { adminChangePlanAction, reactivateMerchantAction, suspendMerchantAction, updateTicketStatusAction } from "@/app/actions/admin";
import type { PlanId } from "@/types/domain";

export function SuspendControls({ merchantId, status, name }: { merchantId: string; status: string; name: string }) {
  const [reason, setReason] = React.useState("");
  if (status === "suspended")
    return (
      <ConfirmDialog
        title={`Réactiver ${name} ?`}
        description="Le commerçant et son équipe retrouvent immédiatement l'accès aux opérations de fidélité."
        confirmLabel="Réactiver"
        onConfirm={async () => { const r = await reactivateMerchantAction(merchantId); r.ok ? toast.success(r.message) : toast.error(r.error); }}
        trigger={<Button variant="success"><RotateCcw /> Réactiver</Button>}
      />
    );
  if (status === "cancelled") return null;
  return (
    <ConfirmDialog
      title={`Suspendre ${name} ?`}
      description="Les scans, inscriptions et campagnes seront bloqués. Les données sont conservées. Action journalisée."
      confirmLabel="Suspendre"
      destructive
      onConfirm={async () => { const r = await suspendMerchantAction(merchantId, reason); if (r.ok) { toast.success(r.message); setReason(""); } else { toast.error(r.error); return false; } }}
      trigger={<Button variant="outline" className="text-danger-fg"><Ban /> Suspendre</Button>}
    >
      <Textarea className="mt-4" placeholder="Motif (obligatoire, visible par le commerçant)" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Motif de suspension" />
    </ConfirmDialog>
  );
}

export function AdminPlanSelect({ merchantId, planId }: { merchantId: string; planId: PlanId }) {
  const [pending, start] = React.useTransition();
  return (
    <NativeSelect
      value={planId}
      disabled={pending}
      className="h-9 w-36"
      aria-label="Offre"
      onChange={(e) => start(async () => { const r = await adminChangePlanAction(merchantId, e.target.value as PlanId); r.ok ? toast.success(r.message) : toast.error(r.error); })}
    >
      <option value="starter">Starter</option>
      <option value="pro">Pro</option>
      <option value="business">Business</option>
    </NativeSelect>
  );
}

export function TicketStatusSelect({ id, status }: { id: string; status: "open" | "pending" | "resolved" }) {
  const [pending, start] = React.useTransition();
  return (
    <NativeSelect value={status} disabled={pending} className="h-9 w-36" aria-label="Statut du ticket" onChange={(e) => start(async () => { const r = await updateTicketStatusAction(id, e.target.value as "open"); r.ok ? toast.success(r.message) : toast.error(r.error); })}>
      <option value="open">Ouvert</option>
      <option value="pending">En attente</option>
      <option value="resolved">Résolu</option>
    </NativeSelect>
  );
}
