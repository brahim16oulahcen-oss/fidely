import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, UserPlus, Footprints, Heart, Moon, Gift, Repeat, Euro, ScanLine, QrCode, Megaphone, ArrowRight, Sparkles } from "lucide-react";
import { requireMerchantPage } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getRepos } from "@/lib/db";
import { loadDataset } from "@/features/analytics/loader";
import { computeKpis, delta, METRICS, popularRewards, previousRange, rangeFromPreset, timeSeries } from "@/features/analytics/metrics";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/misc";
import { DonutChart, TrendChart } from "@/components/analytics/charts";
import { formatEurosRound, formatNumber, formatPercent, formatRelative } from "@/lib/utils/format";
import { txDelta, txTitle } from "@/features/loyalty/labels";
import { env } from "@/config/env";
import { AddCustomerButton } from "@/components/dashboard/add-customer-button";

export const metadata = { title: "Vue d'ensemble" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireMerchantPage();
  if (!can(ctx.actor, "analytics.read")) redirect("/app/scanner");
  const sp = await searchParams;
  const range = rangeFromPreset(sp.periode, sp.du, sp.au);
  const repos = getRepos();
  const d = await loadDataset(repos, ctx.merchant.id);
  const k = computeKpis(d, range, ctx.merchant.settings.attributionRate);
  const p = computeKpis(d, previousRange(range), ctx.merchant.settings.attributionRate, previousRange(range).to);
  const series = timeSeries(d, range);
  const rewards = popularRewards(d, range).slice(0, 5);
  const customerBy = new Map(d.customers.map((c) => [c.id, c]));
  const rewardBy = new Map(d.rewards.map((r) => [r.id, r]));
  const recent = [...d.transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const audits = (await repos.auditLogs.findMany({ merchantId: ctx.merchant.id })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const signups = [...d.customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const activity = [
    ...signups.map((c) => ({ at: c.createdAt, text: `${c.firstName} ${c.lastName.charAt(0)}. a rejoint le programme`, tone: "new" as const })),
    ...audits.filter((a) => !a.action.startsWith("customer.") && !a.action.startsWith("reward.redeemed")).slice(0, 6).map((a) => ({ at: a.createdAt, text: auditText(a.action, a.target), tone: "info" as const })),
    ...d.issuances.filter((i) => i.status === "available").sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt)).slice(0, 4).map((i) => ({ at: i.unlockedAt, text: `${customerBy.get(i.customerId)?.firstName ?? "Un client"} a débloqué « ${rewardBy.get(i.rewardId)?.name ?? "récompense"} »`, tone: "reward" as const })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  const isEmpty = d.customers.length === 0;

  return (
    <>
      <PageHeader
        title={`Bonjour ${ctx.user.name.split(" ")[0]}`}
        description={`Voici l'activité fidélité de ${ctx.merchant.name}.`}
        eyebrow={env.demoMode && ctx.merchant.isDemoSeed ? <Badge variant="demo">Données fictives de démonstration</Badge> : undefined}
        actions={<PeriodFilter current={range.preset} from={sp.du} to={sp.au} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction href="/app/scanner" icon={ScanLine} label="Scanner une carte" primary />
        {can(ctx.actor, "customers.write") && <AddCustomerButton />}
        <QuickAction href="/app/qr-inscription" icon={QrCode} label="QR d'inscription" />
        <QuickAction href="/app/campagnes/nouvelle" icon={Megaphone} label="Nouvelle campagne" />
      </div>

      {isEmpty && (
        <EmptyState
          className="mb-6"
          icon={Sparkles}
          title="Votre programme est prêt à accueillir ses premiers membres"
          description="Affichez votre QR d'inscription en caisse ou inscrivez un client depuis le scanner. Les statistiques se rempliront automatiquement."
          action={<Button asChild><Link href="/app/qr-inscription">Afficher mon QR d&apos;inscription</Link></Button>}
        />
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4" data-testid="kpis">
        <KpiCard testId="kpi-total" label="Total clients" value={formatNumber(k.totalCustomers)} icon={Users} definition={METRICS.totalCustomers.definition} delta={delta(k.totalCustomers, p.totalCustomers)} />
        <KpiCard testId="kpi-new" label="Nouveaux clients" value={formatNumber(k.newCustomers)} icon={UserPlus} definition={METRICS.newCustomers.definition} delta={delta(k.newCustomers, p.newCustomers)} />
        <KpiCard testId="kpi-visits" label="Visites" value={formatNumber(k.visits)} icon={Footprints} definition={METRICS.visits.definition} delta={delta(k.visits, p.visits)} />
        <KpiCard testId="kpi-loyal" label="Clients fidèles" value={formatNumber(k.loyalCustomers)} icon={Heart} definition={METRICS.loyalCustomers.definition} hint="à date" />
        <KpiCard testId="kpi-inactive" label="Clients inactifs" value={formatNumber(k.inactiveCustomers)} icon={Moon} definition={METRICS.inactiveCustomers.definition} hint="à date" />
        <KpiCard testId="kpi-redeemed" label="Récompenses utilisées" value={formatNumber(k.rewardsRedeemed)} icon={Gift} definition={METRICS.rewardsRedeemed.definition} delta={delta(k.rewardsRedeemed, p.rewardsRedeemed)} />
        <KpiCard testId="kpi-return" label="Taux de retour" value={formatPercent(k.returnRate)} icon={Repeat} definition={METRICS.returnRate.definition} delta={delta(k.returnRate, p.returnRate)} />
        <KpiCard testId="kpi-revenue" label="CA enregistré" value={k.revenueRecorded ? formatEurosRound(k.revenueRecorded) : "—"} icon={Euro} definition={METRICS.revenueRecorded.definition} delta={k.revenueRecorded ? delta(k.revenueRecorded, p.revenueRecorded) : undefined} hint={k.revenueRecorded ? undefined : "aucun montant saisi"} />
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Inscriptions et visites</CardTitle>
            <CardDescription>Évolution sur la période sélectionnée</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart data={series} series={[{ key: "visites", name: "Visites" }, { key: "inscriptions", name: "Inscriptions" }]} label="Graphique des inscriptions et visites" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Actifs / inactifs</CardTitle>
            <CardDescription>Répartition des membres à date</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart label="Répartition actifs et inactifs" data={[{ name: "Actifs", value: k.activeCustomers }, { name: "Inactifs", value: k.inactiveCustomers }]} colors={["var(--chart-1)", "var(--chart-5)"]} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Transactions récentes</CardTitle>
              <CardDescription>Dernières opérations enregistrées en caisse</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild><Link href="/app/clients">Tous les clients <ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {recent.length === 0 ? (
              <p className="px-5 pb-4 text-sm text-muted">Aucune transaction pour le moment.</p>
            ) : (
              <ul className="divide-y divide-border" data-testid="recent-transactions">
                {recent.map((t) => {
                  const c = customerBy.get(t.customerId);
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                      <Avatar name={`${c?.firstName ?? "?"} ${c?.lastName ?? ""}`} className="size-8" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/app/clients/${t.customerId}`} className="block truncate text-sm font-medium hover:underline">{c ? `${c.firstName} ${c.lastName}` : "Client"}</Link>
                        <p className="truncate text-xs text-muted">{txTitle(t)}{t.rewardId ? ` · ${rewardBy.get(t.rewardId)?.name ?? ""}` : ""}{t.amountCents ? ` · ${formatEurosRound(t.amountCents)}` : ""}</p>
                      </div>
                      <Badge variant={t.kind === "redeem" || t.kind === "cashback_use" ? "success" : "neutral"}>{txDelta(t)}</Badge>
                      <span className="hidden w-24 text-right text-xs text-muted sm:block">{formatRelative(t.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Récompenses populaires</CardTitle>
              <CardDescription>Utilisations sur la période</CardDescription>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <p className="text-sm text-muted">Aucune récompense utilisée sur la période.</p>
              ) : (
                <ul className="space-y-3">
                  {rewards.map((r) => {
                    const max = Math.max(1, ...rewards.map((x) => x.utilisees));
                    return (
                      <li key={r.id}>
                        <div className="flex justify-between text-sm"><span className="truncate">{r.name}</span><span className="font-medium tabular">{r.utilisees}</span></div>
                        <div className="mt-1 h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary" style={{ width: `${(r.utilisees / max) * 100}%` }} /></div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-3 border-l border-border pl-4">
                {activity.map((a, i) => (
                  <li key={i} className="text-sm">
                    <span className={`absolute -left-[5px] mt-1.5 size-2.5 rounded-full ring-2 ring-surface ${a.tone === "reward" ? "bg-success" : a.tone === "new" ? "bg-primary" : "bg-slate-400"}`} />
                    <p className="leading-snug">{a.text}</p>
                    <p className="text-xs text-muted">{formatRelative(a.at)}</p>
                  </li>
                ))}
                {activity.length === 0 && <li className="text-sm text-muted">Rien à signaler pour l&apos;instant.</li>}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function QuickAction({ href, icon: Icon, label, primary }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-medium shadow-xs transition-colors ${primary ? "border-transparent bg-primary text-white hover:bg-primary-hover dark:text-[#0b0f19]" : "border-border bg-surface hover:bg-surface-2"}`}
    >
      <span className={`flex size-8 items-center justify-center rounded-lg ${primary ? "bg-white/15" : "bg-primary-soft text-primary"}`}>
        <Icon className="size-4" />
      </span>
      {label}
    </Link>
  );
}

function auditText(action: string, target: string) {
  const map: Record<string, string> = {
    "merchant.created": `Commerce créé : ${target}`,
    "program.rules_updated": `Règles mises à jour : ${target}`,
    "program.created": `Programme créé : ${target}`,
    "program.activated": `Programme activé : ${target}`,
    "program.deactivated": `Programme désactivé : ${target}`,
    "campaign.sent": `Campagne envoyée (simulation) : ${target}`,
    "campaign.scheduled": `Campagne programmée : ${target}`,
    "campaign.drafted": `Brouillon de campagne : ${target}`,
    "card.design_updated": `Carte personnalisée : ${target}`,
    "subscription.plan_changed": "Offre modifiée",
    "reward.created": `Récompense créée : ${target}`,
    "reward.updated": `Récompense modifiée : ${target}`,
    "reward.gifted": `Récompense offerte : ${target}`,
    "team.member_invited": `Membre invité : ${target}`,
    "merchant.suspended": "Compte suspendu",
    "merchant.reactivated": "Compte réactivé",
    "merchant.settings_updated": "Paramètres mis à jour",
  };
  return map[action] ?? `${action} · ${target}`;
}
