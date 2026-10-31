"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Upload, Plus, Trash2, ExternalLink, LayoutDashboard, Download, Copy } from "lucide-react";
import type { CardDesign, MerchantCategory, ProgramRules, ProgramType } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/misc";
import { LOGO_ICONS, MerchantLogo } from "@/components/loyalty/merchant-logo";
import { RulesFields } from "@/components/loyalty/rules-fields";
import { TypePicker } from "@/components/loyalty/program-dialogs";
import { ColorField } from "@/components/wallet/card-editor";
import { LoyaltyCardVisual } from "@/components/wallet/loyalty-card-visual";
import { QrCode } from "@/components/loyalty/qr-code";
import { completeOnboardingAction } from "@/app/actions/auth";
import { defaultRulesFor, describeRules } from "@/features/loyalty/engine";
import { cn } from "@/lib/utils/cn";

const STEPS = ["Votre commerce", "Logo et couleurs", "Programme", "Récompenses", "QR d'inscription"];

const CATEGORIES: { id: MerchantCategory; label: string; icon: string; rules: ProgramRules }[] = [
  { id: "cafe", label: "Café / salon de thé", icon: "Coffee", rules: { type: "stamps", stampsRequired: 10, stampsPerVisit: 1, rewardName: "1 café offert", rewardValidityDays: 60 } },
  { id: "bakery", label: "Boulangerie", icon: "Croissant", rules: { type: "stamps", stampsRequired: 12, stampsPerVisit: 1, rewardName: "1 viennoiserie offerte", rewardValidityDays: 30 } },
  { id: "barber", label: "Coiffeur / barbier", icon: "Scissors", rules: { type: "points", pointsPerEuro: 1, welcomePoints: 10 } },
  { id: "beauty", label: "Institut de beauté", icon: "Sparkles", rules: { type: "points", pointsPerEuro: 1, welcomePoints: 20 } },
  { id: "restaurant", label: "Restaurant", icon: "UtensilsCrossed", rules: { type: "cashback", percent: 5, minPurchaseCents: 1500, maxCreditPerTxCents: 1000 } },
  { id: "florist", label: "Fleuriste", icon: "Flower2", rules: { type: "stamps", stampsRequired: 8, stampsPerVisit: 1, rewardName: "1 bouquet offert", rewardValidityDays: 60 } },
  { id: "bookshop", label: "Librairie", icon: "BookOpen", rules: { type: "stamps", stampsRequired: 10, stampsPerVisit: 1, rewardName: "5 € de réduction", rewardValidityDays: 90 } },
  { id: "other", label: "Autre commerce", icon: "Store", rules: { type: "stamps", stampsRequired: 10, stampsPerVisit: 1, rewardName: "1 produit offert", rewardValidityDays: 60 } },
];

const PALETTES = [
  { name: "Espresso", primary: "#3B2416", text: "#FFF7ED", accent: "#F59E0B" },
  { name: "Nuit", primary: "#111827", text: "#F8FAFC", accent: "#818CF8" },
  { name: "Indigo", primary: "#4F46E5", text: "#FFFFFF", accent: "#FDE68A" },
  { name: "Forêt", primary: "#14532D", text: "#F0FDF4", accent: "#86EFAC" },
  { name: "Framboise", primary: "#831843", text: "#FDF2F8", accent: "#F9A8D4" },
  { name: "Océan", primary: "#0C4A6E", text: "#F0F9FF", accent: "#7DD3FC" },
];

type RewardDraft = { name: string; description: string; cost: number; validityDays: number };

export function OnboardingWizard({ ownerName, allowedTypes }: { ownerName: string; allowedTypes: ProgramType[] }) {
  const [step, setStep] = React.useState(0);
  const [business, setBusiness] = React.useState({ name: "", category: "cafe" as MerchantCategory, address: "", postalCode: "76000", city: "Rouen", phone: "", description: "" });
  const [branding, setBranding] = React.useState({ icon: "Coffee", imageDataUrl: "", ...PALETTES[0] });
  const [programName, setProgramName] = React.useState("Carte de fidélité");
  const [rules, setRules] = React.useState<ProgramRules>(CATEGORIES[0].rules);
  const [rewards, setRewards] = React.useState<RewardDraft[]>([]);
  const [terms, setTerms] = React.useState("Programme nominatif, sans obligation d'achat. Récompenses non échangeables contre de l'argent.");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();
  const [created, setCreated] = React.useState<{ slug: string } | null>(null);

  const rewardText = rules.type === "stamps" ? rules.rewardName : rules.type === "cashback" ? `${rules.percent} % en crédit fidélité` : rewards[0] ? `${rewards[0].name} (${rewards[0].cost} pts)` : "";
  const design: CardDesign = { title: programName || "Carte de fidélité", background: branding.primary, text: branding.text, accent: branding.accent, showLogo: true, rewardText, terms };

  const pickCategory = (id: MerchantCategory) => {
    const c = CATEGORIES.find((x) => x.id === id)!;
    setBusiness((b) => ({ ...b, category: id }));
    setBranding((b) => ({ ...b, icon: c.icon }));
    setRules(allowedTypes.includes(c.rules.type) ? c.rules : defaultRulesFor("stamps"));
    if (c.rules.type === "points") setRewards([{ name: "Réduction de 10 €", description: "", cost: 150, validityDays: 90 }]);
    else setRewards([]);
  };

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (business.name.trim().length < 2) e.name = "Nom du commerce requis";
      if (business.address.trim().length < 3) e.address = "Adresse requise";
      if (!/^\d{5}$/.test(business.postalCode)) e.postalCode = "Code postal à 5 chiffres";
      if (business.city.trim().length < 2) e.city = "Ville requise";
    }
    if (s === 2) {
      if (programName.trim().length < 2) e.programName = "Nom du programme requis";
      if (rules.type === "stamps" && (rules.stampsRequired < 2 || rules.stampsRequired > 30)) e["rules.stampsRequired"] = "Entre 2 et 30";
      if (rules.type === "stamps" && rules.rewardName.trim().length < 2) e["rules.rewardName"] = "Récompense requise";
      if (rules.type === "tiers" && rules.goldThreshold <= rules.silverThreshold) e["rules.goldThreshold"] = "Doit dépasser le seuil Silver";
    }
    if (s === 3) {
      if (rules.type === "points" && rewards.length === 0) e.rewards = "Ajoutez au moins une récompense échangeable contre des points.";
      rewards.forEach((r, i) => {
        if (r.name.trim().length < 2) e[`rewards.${i}`] = "Nom requis";
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate(step)) return;
    if (step === 3) return submit();
    setStep((s) => s + 1);
  };

  const submit = () =>
    start(async () => {
      const r = await completeOnboardingAction({
        business,
        branding: { icon: branding.icon, imageDataUrl: branding.imageDataUrl, primary: branding.primary, text: branding.text, accent: branding.accent },
        program: { name: programName, rules },
        rewards,
        card: design,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setCreated({ slug: r.data.slug });
      setStep(4);
      toast.success("Votre commerce est créé.");
    });

  const onLogo = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return toast.error("Format accepté : PNG, JPEG, WebP ou SVG.");
    if (file.size > 200_000) return toast.error("Logo trop volumineux (200 Ko maximum).");
    const reader = new FileReader();
    reader.onload = () => setBranding((b) => ({ ...b, imageDataUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const signupUrl = created ? `${typeof window !== "undefined" ? window.location.origin : ""}/rejoindre/${created.slug}?src=qr` : "";
  const balances = { stamps: rules.type === "stamps" ? Math.min(3, rules.stampsRequired - 1) : 0, points: 40, lifetimePoints: 40, cashbackCents: 250, tier: "bronze" as const };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium">Étape {step + 1} sur 5 · {STEPS[step]}</span>
          <span className="text-muted">{Math.round(((step + (created ? 1 : 0)) / 5) * 100)} %</span>
        </div>
        <Progress value={((step + (created ? 1 : 0)) / 5) * 100} label="Progression de la configuration" />
        <ol className="mt-4 hidden grid-cols-5 gap-2 md:grid">
          {STEPS.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-2 text-xs", i <= step ? "text-foreground" : "text-muted")}>
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold", i < step || created ? "border-success bg-success text-white" : i === step ? "border-primary bg-primary text-white" : "border-border")}>{i < step || (created && i === 4) ? <Check className="size-3.5" /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardContent className="space-y-5 pt-6">
            {step === 0 && (
              <>
                <div><h1 className="text-xl font-semibold">Bienvenue {ownerName.split(" ")[0]} ! Parlez-nous de votre commerce</h1><p className="text-sm text-muted">Ces informations apparaissent sur la page d&apos;inscription de vos clients.</p></div>
                <Field label="Nom du commerce" htmlFor="o-name" error={errors.name}><Input id="o-name" value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} placeholder="Ex. Café des Arts" data-testid="ob-name" /></Field>
                <div className="space-y-1.5">
                  <Label>Activité</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {CATEGORIES.map((c) => {
                      const Icon = LOGO_ICONS[c.icon];
                      return (
                        <button key={c.id} type="button" onClick={() => pickCategory(c.id)} aria-pressed={business.category === c.id} className={cn("flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium", business.category === c.id ? "border-primary bg-primary-soft/60 text-primary" : "border-border hover:border-slate-300")}>
                          <Icon className="size-5" /> {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Field label="Adresse" htmlFor="o-addr" error={errors.address}><Input id="o-addr" value={business.address} onChange={(e) => setBusiness({ ...business, address: e.target.value })} placeholder="12 rue du Gros-Horloge" data-testid="ob-address" /></Field>
                <div className="grid grid-cols-[130px_1fr] gap-3">
                  <Field label="Code postal" htmlFor="o-cp" error={errors.postalCode}><Input id="o-cp" value={business.postalCode} onChange={(e) => setBusiness({ ...business, postalCode: e.target.value })} inputMode="numeric" /></Field>
                  <Field label="Ville" htmlFor="o-city" error={errors.city}><Input id="o-city" value={business.city} onChange={(e) => setBusiness({ ...business, city: e.target.value })} /></Field>
                </div>
                <Field label="Téléphone (facultatif)" htmlFor="o-phone"><Input id="o-phone" type="tel" value={business.phone} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} /></Field>
              </>
            )}

            {step === 1 && (
              <>
                <div><h1 className="text-xl font-semibold">Logo et couleurs</h1><p className="text-sm text-muted">La carte reprend votre identité. Vous pourrez l&apos;affiner à tout moment.</p></div>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(LOGO_ICONS).map(([k, Icon]) => (
                      <button key={k} type="button" aria-label={`Icône ${k}`} aria-pressed={!branding.imageDataUrl && branding.icon === k} onClick={() => setBranding({ ...branding, icon: k, imageDataUrl: "" })} className={cn("flex size-10 items-center justify-center rounded-lg border", !branding.imageDataUrl && branding.icon === k ? "border-primary bg-primary-soft text-primary" : "border-border text-muted")}>
                        <Icon className="size-5" />
                      </button>
                    ))}
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm text-muted hover:text-foreground">
                      <Upload className="size-4" /> Importer
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} />
                    </label>
                    {branding.imageDataUrl && <Button variant="ghost" size="sm" onClick={() => setBranding({ ...branding, imageDataUrl: "" })}>Retirer l&apos;image</Button>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Palettes suggérées</Label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {PALETTES.map((p) => (
                      <button key={p.name} type="button" onClick={() => setBranding({ ...branding, primary: p.primary, text: p.text, accent: p.accent })} className={cn("rounded-xl border p-1.5 text-xs", branding.primary === p.primary ? "border-primary ring-2 ring-primary/20" : "border-border")} aria-label={`Palette ${p.name}`}>
                        <span className="flex h-8 overflow-hidden rounded-lg"><span className="flex-[2]" style={{ background: p.primary }} /><span className="flex-1" style={{ background: p.accent }} /></span>
                        <span className="mt-1 block">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <ColorField id="o-c1" label="Fond" value={branding.primary} onChange={(v) => setBranding({ ...branding, primary: v })} />
                  <ColorField id="o-c2" label="Texte" value={branding.text} onChange={(v) => setBranding({ ...branding, text: v })} />
                  <ColorField id="o-c3" label="Accent" value={branding.accent} onChange={(v) => setBranding({ ...branding, accent: v })} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div><h1 className="text-xl font-semibold">Choisissez votre programme</h1><p className="text-sm text-muted">Le plus simple pour démarrer : la carte à tampons. Pendant l&apos;essai, vous testez l&apos;offre Pro.</p></div>
                <TypePicker value={rules.type} onChange={(t) => { setRules(defaultRulesFor(t)); if (t === "points" || t === "tiers") setRewards([{ name: "Réduction de 10 €", description: "", cost: 150, validityDays: 90 }]); else setRewards([]); }} allowed={allowedTypes} />
                <Field label="Nom du programme" htmlFor="o-pname" error={errors.programName}><Input id="o-pname" value={programName} onChange={(e) => setProgramName(e.target.value)} data-testid="ob-program-name" /></Field>
                <RulesFields value={rules} onChange={setRules} errors={errors} />
                <Alert variant="info" title="Récapitulatif">{describeRules(rules)}</Alert>
              </>
            )}

            {step === 3 && (
              <>
                <div><h1 className="text-xl font-semibold">Configurez vos récompenses</h1><p className="text-sm text-muted">{rules.type === "stamps" ? `La récompense principale « ${rules.rewardName} » est débloquée automatiquement. Ajoutez si vous le souhaitez des cadeaux (anniversaire…).` : rules.type === "cashback" ? "Le crédit s'utilise directement en caisse. Vous pouvez ajouter des cadeaux ponctuels." : "Définissez ce que vos clients obtiennent avec leurs points."}</p></div>
                {rules.type === "stamps" && (
                  <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success-soft/50 p-3 text-sm"><Check className="size-4 text-success" /><span><strong>{rules.rewardName}</strong> après {rules.stampsRequired} passages · valable {rules.rewardValidityDays} jours</span></div>
                )}
                {errors.rewards && <Alert variant="danger">{errors.rewards}</Alert>}
                <ul className="space-y-3">
                  {rewards.map((r, i) => (
                    <li key={i} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_120px_120px_auto] sm:items-end">
                      <Field label="Récompense" htmlFor={`rw-${i}`} error={errors[`rewards.${i}`]}><Input id={`rw-${i}`} value={r.name} onChange={(e) => setRewards(rewards.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></Field>
                      <Field label={rules.type === "points" || rules.type === "tiers" ? "Coût (pts)" : "Coût"} htmlFor={`rc-${i}`}><Input id={`rc-${i}`} type="number" min={0} value={rules.type === "cashback" || rules.type === "stamps" ? 0 : r.cost} disabled={rules.type === "cashback" || rules.type === "stamps"} onChange={(e) => setRewards(rewards.map((x, j) => (j === i ? { ...x, cost: Number(e.target.value) } : x)))} /></Field>
                      <Field label="Validité (j)" htmlFor={`rv-${i}`}><Input id={`rv-${i}`} type="number" min={1} value={r.validityDays} onChange={(e) => setRewards(rewards.map((x, j) => (j === i ? { ...x, validityDays: Number(e.target.value) } : x)))} /></Field>
                      <Button variant="ghost" size="icon" onClick={() => setRewards(rewards.filter((_, j) => j !== i))} aria-label="Supprimer la récompense"><Trash2 /></Button>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" onClick={() => setRewards([...rewards, { name: rules.type === "stamps" || rules.type === "cashback" ? "Cadeau anniversaire" : "Produit offert", description: "", cost: rules.type === "stamps" || rules.type === "cashback" ? 0 : 200, validityDays: 30 }])} disabled={rewards.length >= 6}><Plus /> Ajouter une récompense</Button>
                <Field label="Conditions affichées sur la carte" htmlFor="o-terms"><Input id="o-terms" value={terms} onChange={(e) => setTerms(e.target.value)} /></Field>
              </>
            )}

            {step === 4 && created && (
              <div className="space-y-5">
                <div><h1 className="text-xl font-semibold">Votre QR code d&apos;inscription est prêt</h1><p className="text-sm text-muted">Affichez-le en caisse : vos clients le scannent et obtiennent leur carte, sans application.</p></div>
                <div className="flex flex-col items-center gap-5 sm:flex-row">
                  <div className="rounded-2xl border border-border bg-white p-3 shadow-sm"><QrCode value={signupUrl} label="QR code d'inscription" className="size-48" /></div>
                  <div className="w-full space-y-2">
                    <p className="break-all rounded-lg bg-surface-2 p-2 font-mono text-xs" data-testid="ob-signup-url">{signupUrl}</p>
                    <Button variant="outline" className="w-full" onClick={() => navigator.clipboard.writeText(signupUrl).then(() => toast.success("Lien copié."), () => toast.error("Copie impossible."))}><Copy /> Copier le lien</Button>
                    <Button variant="outline" className="w-full" asChild><Link href="/app/qr-inscription"><Download /> Affiche PDF et impression</Link></Button>
                    <Button variant="outline" className="w-full" asChild><a href={`/rejoindre/${created.slug}?src=qr`} target="_blank" rel="noreferrer" data-testid="ob-open-client"><ExternalLink /> Ouvrir la page client</a></Button>
                  </div>
                </div>
                <Button size="lg" className="w-full" asChild><Link href="/app" data-testid="ob-dashboard"><LayoutDashboard /> Accéder à mon tableau de bord</Link></Button>
              </div>
            )}

            {step < 4 && (
              <div className="flex justify-between border-t border-border pt-5">
                <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft /> Retour</Button>
                <Button onClick={next} loading={pending} data-testid="ob-next">{step === 3 ? "Créer mon programme" : "Continuer"} <ArrowRight /></Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:sticky lg:top-6 lg:h-fit">
          <p className="mb-3 text-sm font-medium text-muted">Aperçu de la carte client</p>
          <LoyaltyCardVisual
            merchantName={business.name || "Votre commerce"}
            logo={{ icon: branding.icon, imageDataUrl: branding.imageDataUrl || undefined }}
            design={design}
            rules={rules}
            balances={balances}
            customerName="Prénom Nom"
            nextRewardLabel={rules.type === "stamps" ? `${rules.stampsRequired - balances.stamps} passages avant : ${rules.rewardName}` : rules.type === "cashback" ? undefined : rewards[0] ? `${Math.max(0, rewards[0].cost - 40)} pts avant : ${rewards[0].name}` : undefined}
            progressRatio={rules.type === "stamps" ? balances.stamps / rules.stampsRequired : 0.3}
          />
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-sm">
            <MerchantLogo icon={branding.icon} imageDataUrl={branding.imageDataUrl || undefined} background={branding.primary} color={branding.text} name={business.name || "Votre commerce"} />
            <div><p className="font-medium">{business.name || "Votre commerce"}</p><p className="text-xs text-muted">{describeRules(rules)}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

