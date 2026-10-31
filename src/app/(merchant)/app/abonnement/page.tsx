import { Check, Minus } from "lucide-react";
import { requireMerchantPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { getBilling, planChangeBlockers } from "@/features/subscriptions/service";
import { PLAN_COMPARISON, PLAN_ORDER, PLANS } from "@/config/plans";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ChangePlanButton, InvoiceDownload } from "@/components/billing/billing-controls";
import { formatDate, formatEuros, formatEurosRound, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Abonnement" };

export default async function BillingPage() {
  const ctx = await requireMerchantPage("billing.manage");
  const { subscription, invoices, usage, provider } = await getBilling({ ...ctx, repos: getRepos() });
  const plan = PLANS[ctx.merchant.planId];
  const meters = [
    { label: "Clients", used: usage.customers, limit: plan.limits.customers },
    { label: "Employés", used: usage.staff, limit: plan.limits.staff },
    { label: "Établissements", used: usage.stores, limit: plan.limits.stores },
    { label: "Programmes", used: usage.programs, limit: plan.limits.programs },
  ];
  const idx = PLAN_ORDER.indexOf(ctx.merchant.planId);
  return (
    <>
      <PageHeader title="Abonnement et facturation" description="Changez d'offre à tout moment. Sans engagement." />
      <Alert variant="demo" className="mb-6" title={provider.label}>Aucun paiement réel n&apos;est effectué en mode démonstration. Les factures sont fictives. En production, la facturation passe par Stripe (Checkout et portail client).</Alert>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Offre {plan.name} <Badge variant={subscription?.status === "active" ? "success" : subscription?.status === "trialing" ? "default" : "warning"}>{subscription?.status === "trialing" ? "Essai gratuit" : subscription?.status === "active" ? "Active" : subscription?.status === "past_due" ? "Paiement en retard" : "Résiliée"}</Badge></CardTitle>
            <CardDescription>{formatEurosRound(plan.priceCents)} HT / mois · {subscription?.status === "trialing" ? "fin de l'essai" : "prochaine échéance"} le {subscription ? formatDate(subscription.currentPeriodEnd) : "—"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            {meters.map((m) => {
              const pct = (m.used / m.limit) * 100;
              return (
                <div key={m.label}>
                  <div className="flex justify-between text-sm"><span>{m.label}</span><span className="tabular text-muted">{formatNumber(m.used)} / {formatNumber(m.limit)}</span></div>
                  <Progress value={pct} className="mt-1.5" barClassName={pct >= 90 ? "bg-warning" : undefined} label={m.label} />
                  {pct >= 90 && <p className="mt-1 text-xs text-warning-fg">Limite bientôt atteinte</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Moyen de paiement</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted">Aucun moyen de paiement enregistré : mode démonstration. En production, la carte est saisie et stockée par Stripe, jamais par Fidely.</CardContent>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Changer d&apos;offre</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id, i) => {
          const p = PLANS[id];
          const current = id === ctx.merchant.planId;
          return (
            <Card key={id} className={cn("flex flex-col", current && "ring-2 ring-primary")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">{p.name}{p.highlight && <Badge>Populaire</Badge>}</CardTitle>
                <p><span className="text-3xl font-semibold">{formatEurosRound(p.priceCents)}</span><span className="text-sm text-muted"> HT/mois</span></p>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="mb-5 flex-1 space-y-1.5 text-sm">{p.bullets.map((b) => <li key={b} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{b}</li>)}</ul>
                <ChangePlanButton planId={id} planName={p.name} price={formatEurosRound(p.priceCents)} current={current} blockers={planChangeBlockers(usage, id)} upgrade={i > idx} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Comparaison détaillée</CardTitle></CardHeader>
        <CardContent className="px-0">
          <Table>
            <THead><TR className="hover:bg-transparent"><TH>Fonctionnalité</TH>{PLAN_ORDER.map((p) => <TH key={p} className="text-center">{PLANS[p].name}</TH>)}</TR></THead>
            <TBody>{PLAN_COMPARISON.map((row) => <TR key={row.label}><TD>{row.label}</TD>{PLAN_ORDER.map((p) => { const v = row.values[p]; return <TD key={p} className="text-center">{typeof v === "boolean" ? (v ? <Check className="mx-auto size-4 text-success" aria-label="Inclus" /> : <Minus className="mx-auto size-4 text-muted" aria-label="Non inclus" />) : v}</TD>; })}</TR>)}</TBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2">Factures <Badge variant="demo">Fictives</Badge></CardTitle></CardHeader>
        <CardContent className="px-0">
          <Table>
            <THead><TR className="hover:bg-transparent"><TH>Numéro</TH><TH>Date</TH><TH className="hidden sm:table-cell">Offre</TH><TH className="text-right">Montant HT</TH><TH>Statut</TH><TH /></TR></THead>
            <TBody>
              {invoices.map((inv) => (
                <TR key={inv.id}>
                  <TD className="font-mono text-xs">{inv.number}</TD>
                  <TD className="text-muted">{formatDate(inv.issuedAt)}</TD>
                  <TD className="hidden sm:table-cell">{PLANS[inv.planId].name}</TD>
                  <TD className="text-right tabular">{formatEuros(inv.amountCents)}</TD>
                  <TD><Badge variant={inv.status === "paid" ? "success" : "warning"}>{inv.status === "paid" ? "Payée" : "À régler"}</Badge></TD>
                  <TD className="text-right"><InvoiceDownload invoice={{ number: inv.number, amountCents: inv.amountCents, planName: PLANS[inv.planId].name, issuedAt: inv.issuedAt, periodStart: inv.periodStart, periodEnd: inv.periodEnd, status: inv.status }} merchant={{ name: ctx.merchant.name, address: `${ctx.merchant.address}, ${ctx.merchant.postalCode} ${ctx.merchant.city}` }} /></TD>
                </TR>
              ))}
              {invoices.length === 0 && <TR><TD colSpan={6} className="text-center text-muted">Aucune facture pendant la période d&apos;essai.</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
