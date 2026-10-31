"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, Gift, History, Settings2, ShieldCheck, Download, Trash2, PartyPopper, Smartphone, Clock } from "lucide-react";
import type { CardSnapshot } from "@/features/loyalty/operations";
import { LoyaltyCardVisual } from "@/components/wallet/loyalty-card-visual";
import { WalletButtons, type WalletStatus } from "@/components/wallet/wallet-buttons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { progressOf, describeRules, TIER_LABEL } from "@/features/loyalty/engine";
import { txDelta, txTitle } from "@/features/loyalty/labels";
import { updatePreferencesAction, deleteAccountAction } from "@/app/actions/customer";
import { formatDate, formatDateTime, formatEuros } from "@/lib/utils/format";

export function CustomerCardView({
  token,
  snapshot,
  merchant,
  consent,
  wallet,
  welcome,
  demo,
}: {
  token: string;
  snapshot: CardSnapshot;
  merchant: { name: string; logo: { icon: string; imageDataUrl?: string }; address: string; email: string };
  consent: { email: boolean; sms: boolean; wallet: boolean };
  wallet: WalletStatus[];
  welcome: boolean;
  demo: boolean;
}) {
  const router = useRouter();
  const { card, program, customer, rewards, issuances, recent } = snapshot;
  const progress = progressOf(program.rules, card, rewards);
  const now = Date.now();
  const available = issuances.filter((i) => i.status === "available" && new Date(i.expiresAt).getTime() > now);
  const past = issuances.filter((i) => i.status !== "available" || new Date(i.expiresAt).getTime() <= now);
  const [prefs, setPrefs] = React.useState(consent);
  const [pending, start] = React.useTransition();

  // Rafraîchissement automatique : la carte reflète un passage en caisse en quelques secondes.
  React.useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 4000);
    return () => clearInterval(id);
  }, [router]);
  React.useEffect(() => setPrefs(consent), [consent]);

  const savePrefs = (next: typeof prefs) => {
    setPrefs(next);
    start(async () => {
      const r = await updatePreferencesAction(token, next);
      if (r.ok) toast.success(r.message);
      else {
        toast.error(r.error);
        setPrefs(consent);
      }
    });
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      {welcome && (
        <Alert variant="success" className="mb-4 animate-fade-in" title={`Bienvenue ${customer.firstName} !`}>
          Votre carte est prête. Présentez le QR code en caisse à chaque passage. Astuce : ajoutez cette page à votre écran d&apos;accueil.
        </Alert>
      )}
      <Tabs defaultValue="carte">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="carte" aria-label="Ma carte"><CreditCard /><span className="sr-only sm:not-sr-only">Carte</span></TabsTrigger>
          <TabsTrigger value="recompenses" aria-label="Mes récompenses"><Gift />{available.length > 0 && <span className="rounded-full bg-success px-1.5 text-[10px] text-white">{available.length}</span>}</TabsTrigger>
          <TabsTrigger value="historique" aria-label="Mon historique"><History /></TabsTrigger>
          <TabsTrigger value="preferences" aria-label="Mes préférences"><Settings2 /></TabsTrigger>
          <TabsTrigger value="donnees" aria-label="Mes données"><ShieldCheck /></TabsTrigger>
        </TabsList>

        <TabsContent value="carte" className="space-y-4">
          <LoyaltyCardVisual merchantName={merchant.name} logo={merchant.logo} design={program.card} rules={program.rules} balances={card} customerName={`${customer.firstName} ${customer.lastName}`.trim()} scanCode={card.scanCode} nextRewardLabel={progress.label} progressRatio={progress.ratio} />
          {available.length > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-success/40 bg-success-soft p-4 animate-fade-in" data-testid="customer-reward-available">
              <PartyPopper className="size-6 shrink-0 text-success" />
              <div className="text-sm"><p className="font-semibold">{available.length > 1 ? `${available.length} récompenses disponibles` : `${available[0].rewardName} disponible !`}</p><p className="text-muted">Présentez votre carte en caisse pour en profiter.</p></div>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-muted">{program.rules.type === "stamps" ? "Tampons" : program.rules.type === "cashback" ? "Crédit disponible" : "Mes points"}</p>
              <p className="text-2xl font-semibold tabular" data-testid="customer-balance">
                {program.rules.type === "stamps" ? `${card.stamps} / ${program.rules.stampsRequired}` : program.rules.type === "cashback" ? formatEuros(card.cashbackCents) : card.points.toLocaleString("fr-FR")}
              </p>
            </div>
            {program.rules.type !== "cashback" && <Progress value={progress.ratio * 100} className="mt-3" label="Progression" />}
            <p className="mt-2 text-sm text-muted">{progress.label}</p>
            {program.rules.type === "tiers" && <p className="mt-2 text-sm">Niveau <Badge variant="night">{TIER_LABEL[card.tier]}</Badge> · {program.rules.benefits[card.tier]}</p>}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Ajouter à mon téléphone</p>
            <WalletButtons statuses={wallet} compact />
            <p className="flex items-start gap-2 text-xs text-muted"><Smartphone className="mt-0.5 size-3.5 shrink-0" /> En attendant : menu du navigateur → « Ajouter à l&apos;écran d&apos;accueil ». Cette carte web fonctionne sans application.</p>
          </div>
          <p className="text-center text-xs text-muted">{describeRules(program.rules)} · {program.card.terms}</p>
        </TabsContent>

        <TabsContent value="recompenses" className="space-y-4">
          <section>
            <h2 className="mb-2 text-sm font-semibold">Disponibles</h2>
            {available.length === 0 && <p className="text-sm text-muted">Aucune récompense disponible pour l&apos;instant. {progress.label}.</p>}
            <ul className="space-y-2">
              {available.map((i) => (
                <li key={i.id} className="flex items-center gap-3 rounded-xl border border-success/40 bg-success-soft/60 p-3"><Gift className="size-5 text-success" /><div className="text-sm"><p className="font-medium">{i.rewardName}</p><p className="flex items-center gap-1 text-xs text-muted"><Clock className="size-3" /> Jusqu&apos;au {formatDate(i.expiresAt)}</p></div></li>
              ))}
            </ul>
          </section>
          {(program.rules.type === "points" || program.rules.type === "tiers") && (
            <section>
              <h2 className="mb-2 text-sm font-semibold">Catalogue</h2>
              <ul className="space-y-2">
                {rewards.filter((r) => r.active && r.cost > 0).map((r) => (
                  <li key={r.id} className="rounded-xl border border-border p-3 text-sm">
                    <div className="flex justify-between"><span className="font-medium">{r.name}</span><span className="tabular text-muted">{r.cost} pts</span></div>
                    <Progress value={Math.min(100, (card.points / r.cost) * 100)} className="mt-2" label={r.name} />
                    <p className="mt-1 text-xs text-muted">{card.points >= r.cost ? "Disponible : demandez-la en caisse" : `Encore ${r.cost - card.points} points`}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold">Utilisées ou expirées</h2>
              <ul className="space-y-1.5 text-sm">{past.slice(0, 10).map((i) => <li key={i.id} className="flex justify-between text-muted"><span>{i.rewardName}</span><span>{i.status === "redeemed" ? `utilisée le ${formatDate(i.redeemedAt!)}` : "expirée"}</span></li>)}</ul>
            </section>
          )}
        </TabsContent>

        <TabsContent value="historique">
          <ol className="space-y-3" data-testid="customer-history">
            {recent.length === 0 && <li className="text-sm text-muted">Aucun passage enregistré pour l&apos;instant.</li>}
            {recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                <div><p className="font-medium">{txTitle(t)}</p><p className="text-xs text-muted">{formatDateTime(t.createdAt)}</p></div>
                <span className="font-medium tabular">{txDelta(t)}</span>
              </li>
            ))}
          </ol>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <p className="text-sm text-muted">Choisissez comment {merchant.name} peut vous contacter. Votre carte fonctionne quel que soit votre choix.</p>
          {(["email", "sms", "wallet"] as const).map((ch) => (
            <label key={ch} className="flex items-center justify-between rounded-xl border border-border p-4 text-sm">
              <span><span className="font-medium">{ch === "email" ? "Offres par email" : ch === "sms" ? "Offres par SMS" : "Notifications sur la carte"}</span><span className="block text-xs text-muted">{ch === "email" ? customer.email : ch === "sms" ? "Au numéro renseigné" : "Lorsque l'intégration Wallet sera active"}</span></span>
              <Switch checked={prefs[ch]} disabled={pending} onCheckedChange={(v) => savePrefs({ ...prefs, [ch]: v })} aria-label={`Consentement ${ch}`} />
            </label>
          ))}
          <p className="text-xs text-muted">Chaque changement est horodaté dans le journal des consentements.</p>
        </TabsContent>

        <TabsContent value="donnees" className="space-y-4 text-sm">
          <div className="rounded-xl border border-border p-4">
            <p className="font-medium">Mes données personnelles</p>
            <dl className="mt-2 space-y-1 text-muted">
              <div className="flex justify-between gap-2"><dt>Nom</dt><dd className="text-foreground">{customer.firstName} {customer.lastName}</dd></div>
              <div className="flex justify-between gap-2"><dt>Email</dt><dd className="truncate text-foreground">{customer.email}</dd></div>
              <div className="flex justify-between gap-2"><dt>Membre depuis</dt><dd className="text-foreground">{formatDate(customer.createdAt)}</dd></div>
            </dl>
          </div>
          <div className="rounded-xl border border-border p-4 text-muted">
            <p className="font-medium text-foreground">Qui traite mes données ?</p>
            <p className="mt-1">Responsable : {merchant.name}, {merchant.address} ({merchant.email}). Sous-traitant : Fidely. Finalité : gestion de votre carte de fidélité et, si vous l&apos;avez accepté, envoi d&apos;offres. Conservation : jusqu&apos;à 3 ans après votre dernier passage.</p>
          </div>
          <Button variant="outline" className="w-full" asChild><a href={`/api/carte/${token}/export`} download><Download /> Télécharger mes données (JSON)</a></Button>
          <ConfirmDialog
            title="Supprimer ma carte et mes données ?"
            description="Vos données personnelles seront définitivement anonymisées, votre solde et vos récompenses seront perdus. Cette action est irréversible."
            confirmLabel="Supprimer définitivement"
            destructive
            onConfirm={async () => {
              const r = await deleteAccountAction(token);
              if (r.ok) {
                toast.success("Vos données ont été supprimées.");
                router.push("/");
              } else toast.error(r.error);
            }}
            trigger={<Button variant="ghost" className="w-full text-danger-fg"><Trash2 /> Supprimer ma carte</Button>}
          />
          {demo && <p className="text-center text-xs text-muted">Mode démonstration : données fictives.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
