"use client";
import * as React from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { toast } from "sonner";
import { Camera, CameraOff, Search, FlaskConical, Loader2, Plus, Gift, CheckCircle2, History, ArrowRight, Wallet, X, PartyPopper, AlertTriangle, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Avatar, Progress } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { searchCardsAction, resolveScanAction, loadCardAction, earnAction, redeemIssuanceAction, redeemPointsAction, applyCashbackAction } from "@/app/actions/scanner";
import type { CardSnapshot } from "@/features/loyalty/operations";
import { progressOf, TIER_LABEL } from "@/features/loyalty/engine";
import { txDelta, txTitle } from "@/features/loyalty/labels";
import { formatEuros, formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type SearchItem = { cardId: string; name: string; email: string; lastVisitAt: string | null; scanCode: string };

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseEuros(v: string): number | null {
  const n = Number(v.replace(",", ".").replace(/[^\d.]/g, ""));
  if (!v.trim() || !Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function ScannerWorkspace({
  stores,
  demo,
  canOverride,
  suspended,
  recentDemo,
}: {
  stores: { id: string; name: string }[];
  demo: boolean;
  canOverride: boolean;
  suspended: boolean;
  recentDemo: SearchItem[];
}) {
  const [snapshot, setSnapshot] = React.useState<CardSnapshot | null>(null);
  const [loadingCard, setLoadingCard] = React.useState(false);
  const [storeId, setStoreId] = React.useState(stores[0]?.id);
  const [tab, setTab] = React.useState(demo ? "simulation" : "search");

  const open = async (fn: () => Promise<{ ok: true; data: CardSnapshot } | { ok: false; error: string }>) => {
    setLoadingCard(true);
    try {
      const r = await fn();
      if (r.ok) {
        setSnapshot(r.data);
        if (typeof window !== "undefined" && window.innerWidth < 1024) setTimeout(() => document.getElementById("card-panel")?.scrollIntoView({ behavior: "smooth" }), 50);
      } else toast.error(r.error);
    } finally {
      setLoadingCard(false);
    }
  };
  const openByCode = (code: string) => open(() => resolveScanAction(code));
  const openById = (id: string) => open(() => loadCardAction(id));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-6">
      <Card className="h-fit">
        <CardContent className="pt-5">
          {stores.length > 1 && (
            <div className="mb-4 space-y-1.5">
              <Label htmlFor="store">Établissement</Label>
              <NativeSelect id="store" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </NativeSelect>
            </div>
          )}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="camera"><Camera /> Caméra</TabsTrigger>
              <TabsTrigger value="search"><Search /> Recherche</TabsTrigger>
              {demo ? <TabsTrigger value="simulation"><FlaskConical /> Simulation</TabsTrigger> : <TabsTrigger value="code">Code</TabsTrigger>}
            </TabsList>
            <TabsContent value="camera">
              <CameraScanner active={tab === "camera"} onCode={openByCode} />
            </TabsContent>
            <TabsContent value="search">
              <CardSearch onPick={openById} />
            </TabsContent>
            <TabsContent value={demo ? "simulation" : "code"}>
              <SimulationPanel demo={demo} recent={recentDemo} onCode={openByCode} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div id="card-panel" className="min-w-0 scroll-mt-20">
        {loadingCard && !snapshot ? (
          <Card className="flex h-80 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted" /></Card>
        ) : snapshot ? (
          <CardPanel key={snapshot.card.id} snapshot={snapshot} onChange={setSnapshot} onClose={() => setSnapshot(null)} storeId={storeId} canOverride={canOverride} suspended={suspended} />
        ) : (
          <Card className="flex min-h-80 flex-col items-center justify-center border-dashed p-8 text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Wallet className="size-7" /></span>
            <p className="font-medium">Aucune carte sélectionnée</p>
            <p className="mt-1 max-w-sm text-sm text-muted">Scannez le QR code présenté par le client, recherchez-le par nom, email ou téléphone{demo ? ", ou utilisez la simulation de scan" : ""}.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function CameraScanner({ active, onCode }: { active: boolean; onCode: (code: string) => void }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const lastRef = React.useRef<{ code: string; at: number } | null>(null);
  const [state, setState] = React.useState<"idle" | "starting" | "running" | "denied" | "unavailable">("idle");

  const stop = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState((s) => (s === "running" || s === "starting" ? "idle" : s));
  }, []);

  React.useEffect(() => {
    if (!active) stop();
    return stop;
  }, [active, stop]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return setState("unavailable");
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      setState("running");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const loop = () => {
        if (!streamRef.current) return;
        if (v.readyState === v.HAVE_ENOUGH_DATA) {
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const res = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (res?.data) {
            const now = Date.now();
            if (!lastRef.current || lastRef.current.code !== res.data || now - lastRef.current.at > 4000) {
              lastRef.current = { code: res.data, at: now };
              navigator.vibrate?.(60);
              onCode(res.data);
            }
          }
        }
        setTimeout(() => requestAnimationFrame(loop), 200);
      };
      loop();
    } catch (e) {
      setState((e as DOMException)?.name === "NotAllowedError" ? "denied" : "unavailable");
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-[#0b0f19]">
        <video ref={videoRef} className={cn("size-full object-cover", state !== "running" && "hidden")} muted playsInline aria-label="Flux de la caméra" />
        {state === "running" ? (
          <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(11,15,25,0.45)]">
            <div className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-primary" />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            {state === "denied" || state === "unavailable" ? <CameraOff className="size-8 text-white/70" /> : <Camera className="size-8 text-white/70" />}
            <p className="text-sm text-white/80">
              {state === "denied"
                ? "Accès à la caméra refusé. Autorisez-la dans les réglages du navigateur, ou utilisez la recherche."
                : state === "unavailable"
                  ? "Caméra indisponible sur cet appareil ou ce navigateur (HTTPS requis). Utilisez la recherche manuelle."
                  : "Le QR code du client est lu directement par la caméra de l'appareil."}
            </p>
            {(state === "idle" || state === "denied") && (
              <Button variant="secondary" onClick={start}><Camera /> Activer la caméra</Button>
            )}
            {state === "starting" && <Loader2 className="size-5 animate-spin" />}
          </div>
        )}
      </div>
      {state === "running" && <Button variant="outline" className="w-full" onClick={stop}>Arrêter la caméra</Button>}
    </div>
  );
}

function CardSearch({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<SearchItem[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchCardsAction(q);
      if (!alive) return;
      setLoading(false);
      if (r.ok) setItems(r.data);
      else toast.error(r.error);
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, email, téléphone ou code carte" className="pl-9" aria-label="Rechercher une carte" autoFocus data-testid="scanner-search" />
      </div>
      <p className="text-xs text-muted">{q ? "Résultats" : "Derniers passages"}</p>
      <ul className="max-h-[360px] space-y-1 overflow-y-auto" aria-busy={loading}>
        {items?.map((i) => (
          <li key={i.cardId}>
            <button onClick={() => onPick(i.cardId)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2" data-testid="scanner-result">
              <Avatar name={i.name} className="size-8" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{i.name}</span>
                <span className="block truncate text-xs text-muted">{i.email} · {formatRelative(i.lastVisitAt)}</span>
              </span>
              <ArrowRight className="size-4 text-muted" />
            </button>
          </li>
        ))}
        {items && items.length === 0 && <li className="py-6 text-center text-sm text-muted">Aucune carte trouvée.</li>}
        {!items && <li className="py-6 text-center"><Loader2 className="mx-auto size-4 animate-spin text-muted" /></li>}
      </ul>
    </div>
  );
}

function SimulationPanel({ demo, recent, onCode }: { demo: boolean; recent: SearchItem[]; onCode: (code: string) => void }) {
  const [code, setCode] = React.useState("");
  return (
    <div className="space-y-4">
      {demo && (
        <Alert variant="demo" title="Simulation de scan">
          Envoie le contenu d&apos;un QR code au même traitement que la caméra. Utile pour une démonstration sans téléphone.
        </Alert>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) onCode(code.trim());
        }}
        className="flex gap-2"
      >
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="FDL-XXXX-XXXX-XXXX" aria-label="Code de la carte" className="font-mono" data-testid="scan-code-input" />
        <Button type="submit" variant="night">Lire</Button>
      </form>
      {demo && recent.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-muted">Cartes récentes — cliquer pour simuler le scan</p>
          <ul className="space-y-1">
            {recent.map((r) => (
              <li key={r.cardId}>
                <button onClick={() => onCode(r.scanCode)} className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left hover:bg-surface-2" data-testid="simulate-scan">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.name}</span>
                    <span className="block font-mono text-[11px] text-muted">{r.scanCode}</span>
                  </span>
                  <Badge variant="demo">Simuler</Badge>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type OpResponse = { ok: true; data: { snapshot: CardSnapshot; duplicate: boolean; unlocked: string[]; tierChanged?: string; message: string } } | { ok: false; error: string; code?: string };

function CardPanel({ snapshot, onChange, onClose, storeId, canOverride, suspended }: { snapshot: CardSnapshot; onChange: (s: CardSnapshot) => void; onClose: () => void; storeId?: string; canOverride: boolean; suspended: boolean }) {
  const { card, program, customer, rewards, issuances, recent } = snapshot;
  const rules = program.rules;
  const [amount, setAmount] = React.useState("");
  const [creditUse, setCreditUse] = React.useState("");
  const [pending, setPending] = React.useState<string | null>(null);
  const [flash, setFlash] = React.useState<{ title: string; detail?: string; celebrate?: boolean } | null>(null);
  const [rateLimited, setRateLimited] = React.useState<string | null>(null);
  const keyRef = React.useRef<Record<string, string>>({});

  const amountCents = parseEuros(amount);
  const needsAmount = rules.type !== "stamps";
  const available = issuances.filter((i) => i.status === "available" && new Date(i.expiresAt) > new Date());
  const progress = progressOf(rules, card, rewards);
  const pointRewards = rewards.filter((r) => r.active && r.cost > 0 && (rules.type === "points" || rules.type === "tiers"));

  const run = async (intent: string, fn: (key: string) => Promise<OpResponse>, onOk?: (d: Extract<OpResponse, { ok: true }>["data"]) => void) => {
    if (pending) return; // protection contre le double clic
    const key = (keyRef.current[intent] ??= newKey());
    setPending(intent);
    try {
      const r = await fn(key);
      if (r.ok) {
        delete keyRef.current[intent];
        onChange(r.data.snapshot);
        setRateLimited(null);
        if (r.data.duplicate) toast.info(r.data.message);
        onOk?.(r.data);
      } else {
        delete keyRef.current[intent];
        if (r.code === "RATE_LIMIT") setRateLimited(r.error);
        else toast.error(r.error);
      }
    } catch {
      // Erreur réseau : on conserve la clé pour qu'un nouvel essai ne soit pas comptabilisé deux fois.
      toast.error("Connexion interrompue. Réessayez : l'opération ne sera pas comptée deux fois.");
    } finally {
      setPending(null);
    }
  };

  const doEarn = (override = false) =>
    run(override ? "earn-override" : "earn", (key) => earnAction({ cardId: card.id, amountCents: needsAmount ? amountCents : amountCents, storeId, idempotencyKey: key, override }), (d) => {
      setAmount("");
      const unlocked = d.unlocked.length ? `Récompense débloquée : ${d.unlocked.join(", ")}` : undefined;
      setFlash({ title: d.message.replace(/\s*\(.*\)$/, ""), detail: unlocked ?? (d.tierChanged ? `Nouveau niveau : ${TIER_LABEL[d.tierChanged as "gold"]}` : undefined), celebrate: Boolean(unlocked || d.tierChanged) });
      toast.success(unlocked ?? "Passage enregistré.");
    });

  return (
    <Card className="overflow-hidden" data-testid="card-panel">
      <div className="flex items-center gap-3 border-b border-border p-4 md:p-5">
        <Avatar name={`${customer.firstName} ${customer.lastName}`} className="size-11 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold" data-testid="card-customer-name">{customer.firstName} {customer.lastName}</p>
          <p className="truncate text-sm text-muted">{program.name} · membre depuis {new Date(customer.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} · {card.visits} visite{card.visits > 1 ? "s" : ""}</p>
        </div>
        <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex"><Link href={`/app/clients/${customer.id}`}>Fiche client</Link></Button>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fermer la carte"><X /></Button>
      </div>

      <div className="grid gap-0 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5 p-4 md:p-5">
          {suspended && <Alert variant="danger" title="Opérations bloquées">Le compte du commerce est suspendu.</Alert>}

          <div className="rounded-xl border border-border p-4" data-testid="card-balance-panel">
            {rules.type === "stamps" ? (
              <>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm text-muted">Tampons</p>
                  <p className="text-3xl font-semibold tabular" data-testid="stamps-count">{card.stamps}<span className="text-lg text-muted">/{rules.stampsRequired}</span></p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Array.from({ length: rules.stampsRequired }, (_, i) => (
                    <span key={i} className={cn("flex size-7 items-center justify-center rounded-full border-2 transition-all", i < card.stamps ? "border-primary bg-primary text-white animate-pop" : "border-border")}>
                      {i < card.stamps && <CheckCircle2 className="size-4" />}
                    </span>
                  ))}
                </div>
              </>
            ) : rules.type === "cashback" ? (
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted">Crédit fidélité disponible</p>
                <p className="text-3xl font-semibold tabular" data-testid="cashback-balance">{formatEuros(card.cashbackCents)}</p>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm text-muted">Points {rules.type === "tiers" && <Badge variant="night" className="ml-1"><Crown /> {TIER_LABEL[card.tier]}</Badge>}</p>
                  <p className="text-3xl font-semibold tabular" data-testid="points-balance">{card.points.toLocaleString("fr-FR")}</p>
                </div>
                <Progress value={progress.ratio * 100} className="mt-3" label="Progression" />
              </>
            )}
            <p className="mt-2 text-xs text-muted">{progress.label}</p>
          </div>

          {flash && (
            <div role="status" className={cn("flex items-start gap-3 rounded-xl border p-3 animate-fade-in", flash.celebrate ? "border-success/40 bg-success-soft" : "border-border bg-surface-2")} data-testid="op-confirmation">
              {flash.celebrate ? <PartyPopper className="mt-0.5 size-5 text-success" /> : <CheckCircle2 className="mt-0.5 size-5 text-success" />}
              <div className="text-sm">
                <p className="font-medium">{flash.title}</p>
                {flash.detail && <p className="text-muted">{flash.detail}</p>}
              </div>
              <button onClick={() => setFlash(null)} className="ml-auto text-muted hover:text-foreground" aria-label="Masquer"><X className="size-4" /></button>
            </div>
          )}

          {rateLimited && (
            <Alert variant="warning" title="Passage rapproché détecté" action={canOverride ? <Button size="sm" variant="outline" onClick={() => doEarn(true)} loading={pending === "earn-override"}>Confirmer quand même</Button> : undefined}>
              {rateLimited}{!canOverride && " Un responsable peut confirmer ce passage."}
            </Alert>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              doEarn();
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="amount">{needsAmount ? "Montant de l'achat (€)" : "Montant de l'achat (€, facultatif)"}</Label>
              <div className="flex gap-2">
                <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={needsAmount ? "ex. 24,50" : "pour le suivi du CA"} className="h-12 text-lg tabular" data-testid="amount-input" />
              </div>
              {needsAmount && amountCents && (
                <p className="text-sm text-muted" data-testid="earn-preview">
                  ={" "}
                  {rules.type === "cashback"
                    ? amountCents >= rules.minPurchaseCents
                      ? `${formatEuros(Math.min(Math.round((amountCents * rules.percent) / 100), rules.maxCreditPerTxCents))} de crédit`
                      : `aucun crédit (minimum ${formatEuros(rules.minPurchaseCents)})`
                    : `${Math.floor((amountCents / 100) * rules.pointsPerEuro * (rules.type === "tiers" ? rules.multipliers[card.tier] : 1))} points`}
                </p>
              )}
            </div>
            <Button type="submit" size="xl" className="w-full" disabled={suspended || (needsAmount && !amountCents)} loading={pending === "earn"} data-testid="earn-button">
              <Plus /> {rules.type === "stamps" ? `Ajouter ${rules.stampsPerVisit > 1 ? `${rules.stampsPerVisit} tampons` : "un tampon"}` : "Valider le passage"}
            </Button>
          </form>

          {rules.type === "cashback" && card.cashbackCents > 0 && (
            <div className="space-y-2 rounded-xl border border-border p-4">
              <Label htmlFor="credit">Utiliser le crédit (€)</Label>
              <div className="flex gap-2">
                <Input id="credit" inputMode="decimal" value={creditUse} onChange={(e) => setCreditUse(e.target.value)} placeholder={`max ${formatEuros(card.cashbackCents)}`} />
                <ConfirmDialog
                  title="Déduire le crédit fidélité ?"
                  description={`${creditUse ? formatEuros(parseEuros(creditUse) ?? 0) : ""} seront déduits du crédit de ${customer.firstName}.`}
                  confirmLabel="Déduire"
                  onConfirm={() => run("cashback", (key) => applyCashbackAction({ cardId: card.id, amountCents: parseEuros(creditUse) ?? 0, idempotencyKey: key, storeId }), () => { setCreditUse(""); toast.success("Crédit déduit."); })}
                  trigger={<Button variant="outline" disabled={!parseEuros(creditUse) || suspended}>Utiliser</Button>}
                />
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium"><Gift className="size-4 text-muted" /> Récompenses disponibles</p>
            {available.length === 0 && pointRewards.length === 0 && <p className="text-sm text-muted">Aucune récompense disponible pour l&apos;instant.</p>}
            <ul className="space-y-2" data-testid="available-rewards">
              {available.map((i) => (
                <li key={i.id} className="flex items-center gap-3 rounded-xl border border-success/40 bg-success-soft/50 p-3">
                  <Gift className="size-5 text-success" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.rewardName}</p>
                    <p className="text-xs text-muted">Valable jusqu&apos;au {new Date(i.expiresAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <ConfirmDialog
                    title={`Utiliser « ${i.rewardName} » ?`}
                    description={`La récompense sera marquée comme utilisée pour ${customer.firstName}. Cette action est tracée et ne peut pas être annulée.`}
                    confirmLabel="Valider l'utilisation"
                    onConfirm={() => run(`redeem:${i.id}`, (key) => redeemIssuanceAction({ issuanceId: i.id, idempotencyKey: key, storeId }), (d) => { setFlash({ title: d.message, detail: "Récompense remise au client." }); toast.success(d.message); })}
                    trigger={<Button size="sm" variant="success" disabled={suspended} loading={pending === `redeem:${i.id}`} data-testid="redeem-button">Utiliser</Button>}
                  />
                </li>
              ))}
              {pointRewards.map((r) => {
                const affordable = card.points >= r.cost && (r.quantity === null || r.issuedCount < r.quantity);
                return (
                  <li key={r.id} className={cn("flex items-center gap-3 rounded-xl border p-3", affordable ? "border-border" : "border-dashed border-border opacity-70")}>
                    <Gift className="size-5 text-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted">{r.cost} points{r.quantity !== null ? ` · stock ${Math.max(0, r.quantity - r.issuedCount)}` : ""}</p>
                    </div>
                    <ConfirmDialog
                      title={`Échanger ${r.cost} points ?`}
                      description={`« ${r.name} » sera remis à ${customer.firstName}. Solde après échange : ${card.points - r.cost} points.`}
                      confirmLabel="Échanger"
                      onConfirm={() => run(`points:${r.id}`, (key) => redeemPointsAction({ cardId: card.id, rewardId: r.id, idempotencyKey: key, storeId }), (d) => { setFlash({ title: d.message }); toast.success(d.message); })}
                      trigger={<Button size="sm" variant={affordable ? "default" : "outline"} disabled={!affordable || suspended}>{affordable ? "Échanger" : `${r.cost - card.points} pts manquants`}</Button>}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="border-t border-border bg-surface-2/40 p-4 md:p-5 xl:border-l xl:border-t-0">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium"><History className="size-4 text-muted" /> Historique</p>
          <ol className="space-y-2.5" data-testid="card-history">
            {recent.length === 0 && <li className="text-sm text-muted">Aucune opération.</li>}
            {recent.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{txTitle(t)}</p>
                  <p className="text-xs text-muted">{formatRelative(t.createdAt)}{t.amountCents ? ` · ${formatEuros(t.amountCents)}` : ""}</p>
                </div>
                <span className={cn("shrink-0 text-xs font-medium tabular", t.kind === "earn" || t.kind === "welcome" ? "text-success-fg" : "text-muted")}>{txDelta(t)}</span>
              </li>
            ))}
          </ol>
          {program.status !== "active" && (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-warning-fg"><AlertTriangle className="size-3.5" /> Programme désactivé</p>
          )}
        </div>
      </div>
    </Card>
  );
}
