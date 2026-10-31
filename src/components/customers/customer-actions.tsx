"use client";
import * as React from "react";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { giftRewardAction } from "@/app/actions/scanner";
import { updateConsentAction } from "@/app/actions/merchant";

export function GiftRewardButton({ cardId, rewards }: { cardId: string; rewards: { id: string; name: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const [rewardId, setRewardId] = React.useState(rewards[0]?.id ?? "");
  const [pending, start] = React.useTransition();
  if (!rewards.length) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full"><Gift /> Offrir une récompense</Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Offrir une récompense</DialogTitle>
          <DialogDescription>Geste commercial ou anniversaire. La récompense apparaît immédiatement sur la carte du client. Action tracée dans le journal.</DialogDescription>
        </DialogHeader>
        <NativeSelect value={rewardId} onChange={(e) => setRewardId(e.target.value)} aria-label="Récompense">
          {rewards.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </NativeSelect>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await giftRewardAction(cardId, rewardId);
                if (r.ok) {
                  toast.success("Récompense ajoutée à la carte du client.");
                  setOpen(false);
                } else toast.error(r.error);
              })
            }
          >
            Offrir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConsentManager({ customerId, consent, canEdit }: { customerId: string; consent: { email: boolean; sms: boolean; wallet: boolean }; canEdit: boolean }) {
  const [pendingChannel, setPendingChannel] = React.useState<"email" | "sms" | "wallet" | null>(null);
  const labels = { email: "Email", sms: "SMS", wallet: "Notifications Wallet" } as const;
  return (
    <ul className="space-y-3">
      {(["email", "sms", "wallet"] as const).map((ch) => (
        <li key={ch} className="flex items-center justify-between gap-3 text-sm">
          <span>
            {labels[ch]}
            <span className="block text-xs text-muted">{consent[ch] ? "Consentement donné par le client" : "Pas de consentement"}</span>
          </span>
          <Switch checked={consent[ch]} disabled={!canEdit || !consent[ch]} onCheckedChange={() => setPendingChannel(ch)} aria-label={`Consentement ${labels[ch]}`} />
        </li>
      ))}
      <li className="text-xs text-muted">Le commerçant peut enregistrer une opposition ; seul le client peut donner son consentement (depuis sa carte).</li>
      <ConfirmDialog
        open={pendingChannel !== null}
        onOpenChange={(o) => !o && setPendingChannel(null)}
        title="Enregistrer l'opposition du client ?"
        description="Le client ne recevra plus de messages marketing sur ce canal. Le changement est inscrit dans le journal des consentements."
        confirmLabel="Enregistrer"
        onConfirm={async () => {
          if (!pendingChannel) return;
          const r = await updateConsentAction(customerId, { ...consent, [pendingChannel]: false });
          if (r.ok) toast.success("Opposition enregistrée.");
          else toast.error(r.error);
          setPendingChannel(null);
        }}
      />
    </ul>
  );
}
