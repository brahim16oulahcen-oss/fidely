"use client";
import * as React from "react";
import { toast } from "sonner";
import { Monitor, Smartphone, Apple } from "lucide-react";
import type { CardDesign, ProgramRules } from "@/types/domain";
import { LoyaltyCardVisual, PhoneFrame } from "./loyalty-card-visual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateCardDesignAction } from "@/app/actions/merchant";
import { useRouter } from "next/navigation";

export function ColorField({ label, value, onChange, id }: { label: string; value: string; onChange: (v: string) => void; id: string }) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="size-10 cursor-pointer rounded-lg border border-border bg-surface p-1" aria-label={`${label} (sélecteur)`} />
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono uppercase" maxLength={7} />
      </div>
    </Field>
  );
}

export function sampleBalances(rules: ProgramRules) {
  return {
    stamps: rules.type === "stamps" ? Math.max(1, Math.round(rules.stampsRequired * 0.6)) : 0,
    points: rules.type === "points" ? 120 : rules.type === "tiers" ? 420 : 0,
    lifetimePoints: rules.type === "tiers" ? 420 : 120,
    cashbackCents: rules.type === "cashback" ? 735 : 0,
    tier: rules.type === "tiers" ? ("silver" as const) : ("bronze" as const),
  };
}

export function CardPreviews({ merchantName, logo, design, rules }: { merchantName: string; logo: { icon: string; imageDataUrl?: string }; design: CardDesign; rules: ProgramRules }) {
  const b = sampleBalances(rules);
  const label = rules.type === "stamps" ? `${rules.stampsRequired - b.stamps} passages avant : ${rules.rewardName}` : rules.type === "tiers" ? "380 pts avant le niveau Gold" : rules.type === "points" ? "30 pts avant votre prochaine récompense" : undefined;
  const ratio = rules.type === "stamps" ? b.stamps / rules.stampsRequired : 0.7;
  const common = { merchantName, logo, design, rules, balances: b, customerName: "Léa Martin", scanCode: "FDL-DEMO-CART-E001", nextRewardLabel: label, progressRatio: ratio };
  return (
    <Tabs defaultValue="web">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="web"><Monitor /> Web</TabsTrigger>
        <TabsTrigger value="iphone"><Apple /> iPhone</TabsTrigger>
        <TabsTrigger value="android"><Smartphone /> Android</TabsTrigger>
      </TabsList>
      <TabsContent value="web" className="flex justify-center py-4"><div className="w-full max-w-sm"><LoyaltyCardVisual {...common} variant="web" /></div></TabsContent>
      <TabsContent value="iphone" className="py-4"><PhoneFrame><LoyaltyCardVisual {...common} variant="iphone" /></PhoneFrame><p className="mt-3 text-center text-xs text-muted">Aperçu indicatif d&apos;un pass Apple Wallet</p></TabsContent>
      <TabsContent value="android" className="py-4"><PhoneFrame os="android"><LoyaltyCardVisual {...common} variant="android" /></PhoneFrame><p className="mt-3 text-center text-xs text-muted">Aperçu indicatif d&apos;une carte Google Wallet</p></TabsContent>
    </Tabs>
  );
}

export function CardEditor({ programs, selectedId, merchantName, logo, readOnly }: { programs: { id: string; name: string; rules: ProgramRules; card: CardDesign }[]; selectedId: string; merchantName: string; logo: { icon: string; imageDataUrl?: string }; readOnly?: boolean }) {
  const router = useRouter();
  const program = programs.find((p) => p.id === selectedId) ?? programs[0];
  const [design, setDesign] = React.useState<CardDesign>(program.card);
  const [pending, start] = React.useTransition();
  React.useEffect(() => setDesign(program.card), [program.id, program.card]);
  const set = <K extends keyof CardDesign>(k: K, v: CardDesign[K]) => setDesign((d) => ({ ...d, [k]: v }));
  const dirty = JSON.stringify(design) !== JSON.stringify(program.card);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px] lg:gap-6">
      <Card>
        <CardHeader><CardTitle>Personnalisation</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {programs.length > 1 && (
            <Field label="Programme" htmlFor="ce-prog">
              <NativeSelect id="ce-prog" value={program.id} onChange={(e) => router.replace(`/app/cartes?programme=${e.target.value}`)}>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </NativeSelect>
            </Field>
          )}
          <Field label="Nom affiché sur la carte" htmlFor="ce-title"><Input id="ce-title" value={design.title} onChange={(e) => set("title", e.target.value)} maxLength={40} data-testid="card-title-input" /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <ColorField id="ce-bg" label="Couleur de fond" value={design.background} onChange={(v) => set("background", v)} />
            <ColorField id="ce-tx" label="Couleur du texte" value={design.text} onChange={(v) => set("text", v)} />
            <ColorField id="ce-ac" label="Couleur d'accent" value={design.accent} onChange={(v) => set("accent", v)} />
          </div>
          <Field label="Texte de récompense" htmlFor="ce-rw" hint="Affiché sur les pass Wallet"><Input id="ce-rw" value={design.rewardText} onChange={(e) => set("rewardText", e.target.value)} maxLength={60} /></Field>
          <Field label="Conditions du programme" htmlFor="ce-terms"><Textarea id="ce-terms" value={design.terms} onChange={(e) => set("terms", e.target.value)} maxLength={400} /></Field>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
            <span>Afficher le logo du commerce</span>
            <Switch checked={design.showLogo} onCheckedChange={(v) => set("showLogo", v)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!dirty || readOnly}
              loading={pending}
              data-testid="save-card"
              onClick={() =>
                start(async () => {
                  const r = await updateCardDesignAction(program.id, design);
                  r.ok ? toast.success(r.message) : toast.error(r.error);
                })
              }
            >
              Enregistrer la carte
            </Button>
            <Button variant="outline" disabled={!dirty} onClick={() => setDesign(program.card)}>Annuler les modifications</Button>
          </div>
        </CardContent>
      </Card>
      <Card className="h-fit lg:sticky lg:top-20">
        <CardHeader><CardTitle>Prévisualisation</CardTitle></CardHeader>
        <CardContent>
          <CardPreviews merchantName={merchantName} logo={logo} design={design} rules={program.rules} />
        </CardContent>
      </Card>
    </div>
  );
}
