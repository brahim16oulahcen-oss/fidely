import Link from "next/link";
import {
  ArrowRight, QrCode, ScanLine, Smartphone, TrendingUp, Users, Gift, Clock, ShieldCheck, Stamp, Coins, Percent, Crown,
  Coffee, Scissors, Croissant, Sparkles, UtensilsCrossed, Store, BellRing, CalendarHeart, UserX, Mail, Wallet, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoyaltyCardVisual, PhoneFrame } from "@/components/wallet/loyalty-card-visual";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Faq } from "@/components/marketing/faq";
import { TrendChart } from "@/components/analytics/charts";
import { getRepos } from "@/lib/db";
import { env } from "@/config/env";
import { loadDataset } from "@/features/analytics/loader";
import { computeKpis, rangeFromPreset, timeSeries } from "@/features/analytics/metrics";
import { formatEuros } from "@/lib/utils/format";
import type { CardDesign, ProgramRules } from "@/types/domain";

export const dynamic = "force-dynamic";

const CAFE = {
  name: "Café Rouen Centre",
  logo: { icon: "Coffee" },
  design: { title: "Carte Café", background: "#3B2416", text: "#FFF7ED", accent: "#F59E0B", showLogo: true, rewardText: "1 café offert", terms: "" } satisfies CardDesign,
  rules: { type: "stamps", stampsRequired: 10, stampsPerVisit: 1, rewardName: "1 café offert", rewardValidityDays: 60 } satisfies ProgramRules,
};
const BARBER = {
  name: "Barber Studio",
  logo: { icon: "Scissors" },
  design: { title: "Club Barber", background: "#0F172A", text: "#F8FAFC", accent: "#22D3EE", showLogo: true, rewardText: "Coupe offerte à 150 pts", terms: "" } satisfies CardDesign,
  rules: { type: "points", pointsPerEuro: 1, welcomePoints: 10 } satisfies ProgramRules,
};
const BEAUTY = {
  name: "Beauty Atelier",
  logo: { icon: "Sparkles" },
  design: { title: "Cercle Beauté", background: "#831843", text: "#FFF1F2", accent: "#F9A8D4", showLogo: true, rewardText: "", terms: "" } satisfies CardDesign,
  rules: { type: "tiers", pointsPerEuro: 1, silverThreshold: 300, goldThreshold: 800, multipliers: { bronze: 1, silver: 1.25, gold: 1.5 }, benefits: { bronze: "", silver: "", gold: "" } } satisfies ProgramRules,
};
const bal = (o: Partial<{ stamps: number; points: number; lifetimePoints: number; cashbackCents: number; tier: "bronze" | "silver" | "gold" }>) => ({ stamps: 0, points: 0, lifetimePoints: 0, cashbackCents: 0, tier: "bronze" as const, ...o });

async function demoPreview() {
  if (!env.demoMode) return null;
  try {
    const d = await loadDataset(getRepos(), "mer_cafe");
    const r = rangeFromPreset("30");
    return { kpis: computeKpis(d, r), series: timeSeries(d, r) };
  } catch {
    return null;
  }
}

function Section({ id, eyebrow, title, intro, children, className }: { id?: string; eyebrow: string; title: string; intro?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24 ${className ?? ""}`}>
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
          {intro && <p className="mt-4 text-lg leading-relaxed text-muted">{intro}</p>}
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

export default async function LandingPage() {
  const preview = await demoPreview();
  return (
    <>
      {/* 1. Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 sm:pt-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_70%_10%,rgba(79,70,229,0.14),transparent),radial-gradient(40%_40%_at_10%_80%,rgba(16,185,129,0.08),transparent)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-fade-in">
            <Badge variant="outline" className="mb-5">Conçu à Rouen pour les commerces de proximité</Badge>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Vos clients reviennent. <span className="text-primary">Votre commerce grandit.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">Créez votre programme de fidélité digital en quelques minutes. Sans application à télécharger pour vos clients.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild data-testid="cta-signup"><Link href="/inscription">Essayer gratuitement <ArrowRight /></Link></Button>
              <Button size="lg" variant="outline" asChild data-testid="cta-demo"><Link href="/demo">Voir la démonstration</Link></Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {["14 jours d'essai, sans carte bancaire", "Prêt en 10 minutes", "Sans engagement"].map((t) => <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-success" />{t}</li>)}
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -right-4 top-10 hidden w-56 rotate-6 opacity-90 sm:block">
              <LoyaltyCardVisual merchantName={BARBER.name} logo={BARBER.logo} design={BARBER.design} rules={BARBER.rules} balances={bal({ points: 112 })} customerName="Hugo L." progressRatio={0.75} nextRewardLabel="Encore 38 points" />
            </div>
            <div className="relative w-[88%] -rotate-2">
              <LoyaltyCardVisual merchantName={CAFE.name} logo={CAFE.logo} design={CAFE.design} rules={CAFE.rules} balances={bal({ stamps: 7 })} customerName="Léa Martin" scanCode="FDL-DEMO-CAFE-0007" progressRatio={0.7} nextRewardLabel="Encore 3 tampons avant votre café offert" />
            </div>
            <div className="relative -mt-6 ml-auto w-64 rounded-2xl border border-border bg-surface p-4 shadow-xl">
              <p className="flex items-center gap-2 text-xs text-muted"><ScanLine className="size-3.5" /> Scanner · il y a 2 s</p>
              <p className="mt-1 text-sm font-semibold">+1 tampon pour Léa</p>
              <p className="text-xs text-success-fg">Solde mis à jour sur sa carte</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Démonstration visuelle des cartes */}
      <Section id="cartes" eyebrow="Cartes digitales" title="Une carte à vos couleurs, dans la poche de chaque client" intro="Tampons, points, crédit ou statut VIP : la carte se met à jour en temps réel après chaque passage en caisse." className="bg-surface">
        <div className="grid items-end gap-10 md:grid-cols-3">
          <div><PhoneFrame os="ios"><LoyaltyCardVisual variant="iphone" merchantName={CAFE.name} logo={CAFE.logo} design={CAFE.design} rules={CAFE.rules} balances={bal({ stamps: 4 })} customerName="Camille R." scanCode="FDL-DEMO-0000-0001" /></PhoneFrame><p className="mt-4 text-center text-sm text-muted">Aperçu iPhone</p></div>
          <div><PhoneFrame os="android"><LoyaltyCardVisual variant="android" merchantName={BARBER.name} logo={BARBER.logo} design={BARBER.design} rules={BARBER.rules} balances={bal({ points: 86 })} customerName="Hugo L." scanCode="FDL-DEMO-0000-0002" /></PhoneFrame><p className="mt-4 text-center text-sm text-muted">Aperçu Android</p></div>
          <div className="space-y-4"><LoyaltyCardVisual merchantName={BEAUTY.name} logo={BEAUTY.logo} design={BEAUTY.design} rules={BEAUTY.rules} balances={bal({ points: 540, lifetimePoints: 540, tier: "silver" })} customerName="Sarah B." progressRatio={0.45} nextRewardLabel="Encore 260 points pour Gold" /><p className="text-center text-sm text-muted">Carte web : fonctionne sur tous les téléphones</p></div>
        </div>
      </Section>

      {/* 3. Fonctionnement */}
      <Section id="fonctionnement" eyebrow="Fonctionnement" title="Trois étapes, zéro friction">
        <ol className="grid gap-5 md:grid-cols-3">
          {[
            { icon: QrCode, t: "Le client scanne votre QR", d: "Affiche en caisse ou sur la vitrine. Il s'inscrit en 20 secondes avec son prénom et son email." },
            { icon: Smartphone, t: "Il reçoit sa carte", d: "Une carte web à vos couleurs s'ouvre instantanément. Aucune application à installer." },
            { icon: ScanLine, t: "Vous validez ses passages", d: "Votre équipe scanne la carte depuis une tablette ou un téléphone. Les récompenses se débloquent automatiquement." },
          ].map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><s.icon className="size-5" /></span><span className="text-sm font-medium text-muted">Étape {i + 1}</span></div>
              <p className="mt-5 text-lg font-semibold">{s.t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 4. Bénéfices */}
      <Section eyebrow="Pour les commerçants" title="Moins de cartes perdues, plus de clients qui reviennent" className="bg-night text-white dark:bg-surface dark:text-foreground">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: TrendingUp, t: "Faites revenir vos clients", d: "Une récompense visible et une relance au bon moment donnent une raison de repasser." },
            { icon: Users, t: "Connaissez votre clientèle", d: "Qui vient souvent, qui ne vient plus, quel jour : sans tableur ni carton." },
            { icon: Clock, t: "Rien à gérer au quotidien", d: "Un scan en caisse suffit. Les tampons, les récompenses et l'historique se tiennent tout seuls." },
            { icon: ShieldCheck, t: "Fini la fraude au tampon", d: "Seule votre équipe peut créditer une carte, chaque opération est tracée et vérifiée." },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl border border-white/10 bg-white/5 p-6 dark:border-border dark:bg-surface-2">
              <b.icon className="size-5 text-indigo-300 dark:text-primary" />
              <p className="mt-4 font-semibold">{b.t}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/70 dark:text-muted">{b.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5. Wallet */}
      <Section id="wallet" eyebrow="Apple Wallet et Google Wallet" title="Dans le portefeuille du téléphone, à côté de la carte bancaire" intro="Fidely est conçu pour publier vos cartes dans Apple Wallet et Google Wallet. Ces intégrations demandent un compte émetteur et des certificats : elles s'activent lors de la mise en production. En attendant, la carte web fonctionne sur tous les téléphones et peut être ajoutée à l'écran d'accueil.">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Wallet, t: "Apple Wallet", s: "Intégration à configurer", d: "Pass .pkpass signé, mises à jour poussées après chaque passage." },
            { icon: Wallet, t: "Google Wallet", s: "Intégration à configurer", d: "Loyalty Class et Objects via l'API Google Wallet." },
            { icon: Smartphone, t: "Carte web", s: "Disponible", d: "Lien sécurisé, QR code, rafraîchissement automatique. Aucun prérequis." },
          ].map((w) => (
            <div key={w.t} className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between"><w.icon className="size-5 text-primary" /><Badge variant={w.s === "Disponible" ? "success" : "warning"}>{w.s}</Badge></div>
              <p className="mt-4 font-semibold">{w.t}</p>
              <p className="mt-2 text-sm text-muted">{w.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 6. Programmes */}
      <Section id="programmes" eyebrow="Programmes de fidélité" title="Le programme qui ressemble à votre commerce" className="bg-surface">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Stamp, t: "Tampons", ex: "10 cafés achetés = 1 offert", d: "Le grand classique, compris par tous." },
            { icon: Coins, t: "Points", ex: "1 € dépensé = 1 point", d: "Un catalogue de récompenses à plusieurs paliers." },
            { icon: Percent, t: "Cashback fidélité", ex: "5 % crédités sur la carte", d: "Un crédit à utiliser lors d'un prochain achat." },
            { icon: Crown, t: "Niveaux VIP", ex: "Bronze, Silver, Gold", d: "Des avantages qui grandissent avec la fidélité." },
          ].map((p) => (
            <div key={p.t} className="rounded-2xl border border-border p-6">
              <p.icon className="size-5 text-primary" />
              <p className="mt-4 font-semibold">{p.t}</p>
              <p className="mt-1 text-sm font-medium text-foreground/80">{p.ex}</p>
              <p className="mt-2 text-sm text-muted">{p.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">Vous changez vos règles ? Elles s&apos;appliquent aux passages suivants. Les récompenses déjà gagnées et l&apos;historique ne sont jamais modifiés.</p>
      </Section>

      {/* 7. Dashboard */}
      <Section eyebrow="Tableau de bord" title="Des chiffres simples, calculés à partir de vos passages réels" intro="Clients, visites, taux de retour, récompenses utilisées et chiffre d'affaires enregistré : chaque indicateur a une définition claire, sans promesse invérifiable.">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_30px_80px_-40px_rgba(17,24,39,0.35)]">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-xs text-muted">
            <span className="size-2.5 rounded-full bg-danger/60" /><span className="size-2.5 rounded-full bg-warning/60" /><span className="size-2.5 rounded-full bg-success/60" />
            <span className="ml-3">Café Rouen Centre · 30 derniers jours</span>
            {preview && <Badge variant="demo" className="ml-auto">Données de démonstration</Badge>}
          </div>
          {preview ? (
            <div className="grid gap-6 p-5 lg:grid-cols-[1fr_2fr]">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Total clients", preview.kpis.totalCustomers.toLocaleString("fr-FR")],
                  ["Visites", preview.kpis.visits.toLocaleString("fr-FR")],
                  ["Taux de retour", `${Math.round(preview.kpis.returnRate * 100)} %`],
                  ["CA enregistré", formatEuros(preview.kpis.revenueRecorded)],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl border border-border p-4"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-xl font-semibold tabular">{v}</p></div>
                ))}
              </div>
              <div className="rounded-xl border border-border p-4"><p className="mb-2 text-sm font-medium">Visites par jour</p><TrendChart data={preview.series} series={[{ key: "visites", name: "Visites" }]} height={200} label="Visites par jour sur 30 jours" /></div>
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-muted">Ouvrez la démonstration pour explorer un tableau de bord complet.</div>
          )}
        </div>
        <div className="mt-6"><Button variant="outline" asChild><Link href="/demo">Explorer le tableau de bord de démonstration <ArrowRight /></Link></Button></div>
      </Section>

      {/* 8. Automatisations */}
      <Section eyebrow="Automatisations marketing" title="Le bon message, au bon moment, sans y penser" className="bg-surface" intro="Uniquement auprès des clients ayant accepté de recevoir vos offres. La désinscription est respectée automatiquement.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Mail, t: "Bienvenue", d: "Un message chaleureux juste après l'inscription." },
            { icon: Gift, t: "Récompense disponible", d: "Prévenir le client dès qu'un cadeau l'attend." },
            { icon: UserX, t: "Client inactif", d: "Relancer après 45 jours sans visite." },
            { icon: CalendarHeart, t: "Anniversaire", d: "Une attention le jour J." },
          ].map((a) => (
            <div key={a.t} className="flex gap-4 rounded-2xl border border-border p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><a.icon className="size-5" /></span>
              <div><p className="font-semibold">{a.t}</p><p className="mt-1 text-sm text-muted">{a.d}</p></div>
            </div>
          ))}
        </div>
        <p className="mt-6 flex items-center gap-2 text-sm text-muted"><BellRing className="size-4" /> Dans ce prototype, les envois email et SMS sont simulés et journalisés : aucun message réel n&apos;est envoyé.</p>
      </Section>

      {/* 9. Cas d'usage */}
      <Section id="metiers" eyebrow="Par métier" title="Pensé pour les commerces de quartier">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Coffee, t: "Cafés", d: "10 boissons = 1 offerte. Le geste que vos habitués attendent." },
            { icon: Croissant, t: "Boulangeries", d: "Tampons au passage, viennoiserie offerte, statistiques par boutique." },
            { icon: Scissors, t: "Barbiers et coiffeurs", d: "Points sur chaque prestation, relance automatique au bout d'un mois." },
            { icon: Sparkles, t: "Instituts de beauté", d: "Niveaux Bronze, Silver, Gold et avantages exclusifs." },
            { icon: UtensilsCrossed, t: "Restaurants", d: "Cashback sur l'addition, à utiliser au prochain repas." },
            { icon: Store, t: "Boutiques", d: "Points sur les achats et offres ciblées pour vos meilleurs clients." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-border bg-surface p-6"><c.icon className="size-5 text-primary" /><p className="mt-4 font-semibold">{c.t}</p><p className="mt-2 text-sm text-muted">{c.d}</p></div>
          ))}
        </div>
      </Section>

      {/* 10. Tarifs */}
      <Section id="tarifs" eyebrow="Tarifs" title="Un prix clair, sans engagement" intro="14 jours d'essai gratuit, sans carte bancaire. Prix hors taxes." className="bg-surface">
        <PricingCards />
        <p className="mt-6 text-center text-sm"><Link className="text-primary underline-offset-4 hover:underline" href="/tarifs">Comparer toutes les fonctionnalités</Link></p>
      </Section>

      {/* 11. FAQ */}
      <Section eyebrow="Questions fréquentes" title="Vous vous demandez peut-être">
        <div className="max-w-3xl"><Faq /></div>
      </Section>

      {/* 12. CTA final */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-night px-6 py-16 text-center text-white dark:bg-surface-2 dark:text-foreground sm:px-12">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Votre première carte de fidélité digitale, aujourd&apos;hui.</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70 dark:text-muted">Configurez votre programme, imprimez votre QR code et scannez votre premier client en quelques minutes.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild className="bg-white text-night hover:bg-white/90 dark:bg-primary dark:text-white"><Link href="/inscription">Essayer gratuitement</Link></Button>
            <Button size="lg" variant="outline" asChild className="border-white/30 bg-transparent text-white hover:bg-white/10 dark:border-border dark:text-foreground"><Link href="/demo">Voir la démonstration</Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}
