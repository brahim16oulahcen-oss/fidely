"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MessageSquare, Wallet, Users, ShieldCheck, Send, CalendarClock, FileText, Check } from "lucide-react";
import type { Channel, SegmentId } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field, Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { estimateAudienceAction, createCampaignAction } from "@/app/actions/campaigns";
import { cn } from "@/lib/utils/cn";

const CHANNELS: { id: Channel; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { id: "email", label: "Email", icon: Mail, hint: "Objet + message, jusqu'à 600 caractères" },
  { id: "sms", label: "SMS", icon: MessageSquare, hint: "320 caractères max. (2 SMS)" },
  { id: "wallet", label: "Notification Wallet", icon: Wallet, hint: "Nécessite l'intégration Wallet en production" },
];

export function CampaignWizard({ merchantName, segments }: { merchantName: string; segments: { id: SegmentId; label: string; description: string }[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [channel, setChannel] = React.useState<Channel>("email");
  const [segment, setSegment] = React.useState<SegmentId>("active");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("Bonjour {prenom}, ");
  const [mode, setMode] = React.useState<"send" | "schedule" | "draft">("send");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [audience, setAudience] = React.useState<{ eligible: number; consenting: number; excluded: number } | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    let alive = true;
    setAudience(null);
    estimateAudienceAction(segment, channel).then((r) => alive && r.ok && setAudience(r.data));
    return () => {
      alive = false;
    };
  }, [segment, channel]);

  const preview = message.replaceAll("{prenom}", "Léa").replaceAll("{commerce}", merchantName);
  const submit = () =>
    start(async () => {
      const r = await createCampaignAction({ name, channel, segment, subject: channel === "email" ? subject : undefined, message, mode, scheduledAt: mode === "schedule" ? new Date(scheduledAt).toISOString() : undefined });
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
        return;
      }
      if (mode === "send") toast.success(`Simulation : ${r.data.sent} messages inscrits au journal, ${r.data.excluded} clients exclus faute de consentement. Aucun message réel envoyé.`, { duration: 7000 });
      else toast.success(mode === "schedule" ? "Campagne programmée." : "Brouillon enregistré.");
      router.push("/app/campagnes");
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-5 pt-5">
            <Field label="Nom interne de la campagne" htmlFor="c-name" error={errors.name}><Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Offre de la Toussaint" data-testid="campaign-name" /></Field>
            <div className="space-y-2">
              <Label>Canal</Label>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
                {CHANNELS.map((c) => (
                  <button key={c.id} type="button" role="radio" aria-checked={channel === c.id} onClick={() => setChannel(c.id)} className={cn("rounded-xl border p-3 text-left", channel === c.id ? "border-primary bg-primary-soft/60 ring-2 ring-primary/20" : "border-border hover:border-slate-300")}>
                    <c.icon className="size-4 text-primary" />
                    <p className="mt-1.5 text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-muted">{c.hint}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {segments.map((s) => (
                  <button key={s.id} type="button" onClick={() => setSegment(s.id)} aria-pressed={segment === s.id} className={cn("rounded-xl border p-3 text-left", segment === s.id ? "border-primary bg-primary-soft/60 ring-2 ring-primary/20" : "border-border hover:border-slate-300")}>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted">{s.description}</p>
                  </button>
                ))}
              </div>
            </div>
            {channel === "email" && <Field label="Objet" htmlFor="c-subj" error={errors.subject}><Input id="c-subj" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="campaign-subject" /></Field>}
            <Field label="Message" htmlFor="c-msg" error={errors.message} hint={`Variables : {prenom}, {commerce} · ${message.length} caractères`}>
              <Textarea id="c-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} data-testid="campaign-message" />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 pt-5">
            <Label>Envoi</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                ["send", "Envoyer maintenant", Send],
                ["schedule", "Programmer", CalendarClock],
                ["draft", "Brouillon", FileText],
              ] as const).map(([id, label, Icon]) => (
                <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id} className={cn("flex items-center gap-2 rounded-xl border p-3 text-sm font-medium", mode === id ? "border-primary bg-primary-soft/60" : "border-border")}>
                  <Icon className="size-4 text-primary" /> {label}
                </button>
              ))}
            </div>
            {mode === "schedule" && <Field label="Date et heure d'envoi" htmlFor="c-at" error={errors.scheduledAt}><Input id="c-at" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></Field>}
            <Alert variant="demo" title="Simulation">Aucun email, SMS ou notification n&apos;est réellement envoyé en mode démonstration : les envois sont inscrits dans le journal interne.</Alert>
            <Button size="lg" onClick={submit} loading={pending} disabled={!audience} data-testid="campaign-submit">
              {mode === "send" ? <><Send /> Lancer la simulation d&apos;envoi</> : mode === "schedule" ? "Programmer la campagne" : "Enregistrer le brouillon"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
        <Card>
          <CardContent className="space-y-3 pt-5">
            <p className="flex items-center gap-2 text-sm font-medium"><Users className="size-4 text-muted" /> Destinataires</p>
            {audience ? (
              <>
                <p className="text-3xl font-semibold tabular" data-testid="audience-consenting">{audience.consenting}</p>
                <p className="text-sm text-muted">sur {audience.eligible} clients du segment</p>
                <p className="flex items-start gap-2 rounded-lg bg-surface-2 p-2.5 text-xs text-muted"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" /> {audience.excluded} client{audience.excluded > 1 ? "s" : ""} exclu{audience.excluded > 1 ? "s" : ""} : pas de consentement {channel === "email" ? "email" : channel === "sms" ? "SMS" : "Wallet"}. Base légale : consentement (art. L34-5 CPCE).</p>
              </>
            ) : (
              <div className="h-20 animate-pulse rounded-lg bg-surface-2" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="mb-3 flex items-center justify-between text-sm font-medium">Aperçu <Badge variant="demo">Simulation</Badge></p>
            <div className="rounded-[28px] border-[8px] border-[#0b0f19] bg-[#f2f2f7] p-3 dark:bg-[#1c1c1e]">
              {channel === "email" ? (
                <div className="rounded-xl bg-white p-3 text-sm text-slate-800 shadow-sm">
                  <p className="text-xs text-slate-500">De : {merchantName}</p>
                  <p className="font-semibold">{subject || "Objet de l'email"}</p>
                  <p className="mt-2 whitespace-pre-wrap">{preview}</p>
                  <p className="mt-3 border-t pt-2 text-[10px] text-slate-400">Se désinscrire · Vous recevez cet email car vous avez accepté les offres de {merchantName}.</p>
                </div>
              ) : channel === "sms" ? (
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-slate-800 shadow-sm">{preview}<p className="mt-1 text-[10px] text-slate-400">STOP au 36xxx</p></div>
              ) : (
                <div className="flex gap-2 rounded-xl bg-white/90 p-3 text-sm text-slate-800 shadow-sm"><Wallet className="size-5 text-slate-500" /><div><p className="font-semibold">{merchantName}</p><p>{preview}</p></div></div>
              )}
            </div>
            <ul className="mt-3 space-y-1 text-xs text-muted">
              <li className="flex items-center gap-1.5"><Check className="size-3 text-success" /> Lien de désinscription inclus</li>
              <li className="flex items-center gap-1.5"><Check className="size-3 text-success" /> Clients sans consentement exclus automatiquement</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
