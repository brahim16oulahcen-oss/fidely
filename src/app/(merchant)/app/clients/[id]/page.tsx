import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Cake, CalendarPlus, Footprints, Euro, Gift, ShieldCheck, MessageSquare, Receipt } from "lucide-react";
import { requireMerchantPage } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getRepos } from "@/lib/db";
import { getCustomerDetail } from "@/features/customers/service";
import { primaryStatus, SEGMENTS } from "@/features/customers/segments";
import { progressOf } from "@/features/loyalty/engine";
import { txDelta, txTitle } from "@/features/loyalty/labels";
import { AppError } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { StatusBadge } from "@/components/customers/status-badge";
import { LoyaltyCardVisual } from "@/components/wallet/loyalty-card-visual";
import { ConsentManager, GiftRewardButton } from "@/components/customers/customer-actions";
import { formatDate, formatDateTime, formatEuros } from "@/lib/utils/format";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireMerchantPage("customers.read");
  const { id } = await params;
  let detail;
  try {
    detail = await getCustomerDetail({ ...ctx, repos: getRepos() }, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { customer, snapshot, segments, transactions, consentLogs, messages } = detail;
  const rewardName = new Map(snapshot?.rewards.map((r) => [r.id, r.name]) ?? []);
  const timeline = [
    ...transactions.map((t) => ({ at: t.createdAt, kind: "tx" as const, icon: t.kind === "redeem" ? Gift : Receipt, title: `${txTitle(t)}${t.rewardId ? ` · ${rewardName.get(t.rewardId) ?? ""}` : ""}`, detail: `${txDelta(t)}${t.amountCents ? ` · achat ${formatEuros(t.amountCents)}` : ""} · ${t.actorName}${t.storeName ? ` · ${t.storeName}` : ""} · règles v${t.ruleVersion}`, success: t.kind === "redeem" })),
    ...(snapshot?.issuances ?? []).map((i) => ({ at: i.unlockedAt, kind: "iss" as const, icon: Gift, title: `Récompense débloquée · ${i.rewardName}`, detail: i.status === "redeemed" ? "Utilisée" : i.status === "expired" ? "Expirée" : `Disponible jusqu'au ${formatDate(i.expiresAt)}`, success: i.status === "available" })),
    ...consentLogs.map((c) => ({ at: c.createdAt, kind: "cns" as const, icon: ShieldCheck, title: c.channel === "program" ? (c.granted ? "Adhésion au programme" : "Retrait du programme") : `Consentement ${c.channel.toUpperCase()} ${c.granted ? "donné" : "refusé / retiré"}`, detail: c.source, success: false })),
    ...messages.map((m) => ({ at: m.createdAt, kind: "msg" as const, icon: MessageSquare, title: `${m.campaignName} (${m.channel})`, detail: m.status === "simulated" ? `Simulation d'envoi — « ${m.preview.slice(0, 80)}… »` : "Non envoyé : pas de consentement", success: false })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const program = snapshot?.program;
  const prog = snapshot && program ? progressOf(program.rules, snapshot.card, snapshot.rewards) : null;

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3"><Link href="/app/clients"><ArrowLeft /> Clients</Link></Button>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={`${customer.firstName} ${customer.lastName}`} className="size-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="customer-name">{customer.firstName} {customer.lastName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={primaryStatus(segments)} />
            {segments.filter((s) => s !== "all").map((s) => <Badge key={s} variant="outline">{SEGMENTS[s].label}</Badge>)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr] lg:gap-6">
        <div className="space-y-4">
          {snapshot && program && (
            <LoyaltyCardVisual
              merchantName={ctx.merchant.name}
              logo={ctx.merchant.logo}
              design={program.card}
              rules={program.rules}
              balances={snapshot.card}
              customerName={`${customer.firstName} ${customer.lastName}`}
              nextRewardLabel={prog?.label}
              progressRatio={prog?.ratio}
            />
          )}
          <Card>
            <CardContent className="space-y-3 pt-5 text-sm">
              <p className="flex items-center gap-2"><Mail className="size-4 text-muted" /> {customer.email}</p>
              {customer.phone && <p className="flex items-center gap-2"><Phone className="size-4 text-muted" /> {customer.phone}</p>}
              {customer.birthday && <p className="flex items-center gap-2"><Cake className="size-4 text-muted" /> Anniversaire le {new Date(`2000-${customer.birthday}`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>}
              <p className="flex items-center gap-2"><CalendarPlus className="size-4 text-muted" /> Inscrit le {formatDate(customer.createdAt)} ({customer.source === "qr" ? "QR code" : customer.source === "staff" ? "en caisse" : "web"})</p>
              {snapshot && (
                <>
                  <p className="flex items-center gap-2"><Footprints className="size-4 text-muted" /> {snapshot.card.visits} visites</p>
                  {snapshot.card.totalSpentCents > 0 && <p className="flex items-center gap-2"><Euro className="size-4 text-muted" /> {formatEuros(snapshot.card.totalSpentCents)} enregistrés</p>}
                </>
              )}
            </CardContent>
          </Card>
          {snapshot && can(ctx.actor, "customers.write") && (
            <GiftRewardButton cardId={snapshot.card.id} rewards={snapshot.rewards.filter((r) => r.active).map((r) => ({ id: r.id, name: r.name }))} />
          )}
          <Card>
            <CardHeader><CardTitle>Préférences marketing</CardTitle></CardHeader>
            <CardContent>
              <ConsentManager customerId={customer.id} consent={customer.consent} canEdit={can(ctx.actor, "customers.write")} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Historique chronologique</CardTitle></CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l border-border pl-6" data-testid="customer-timeline">
              {timeline.map((e, i) => (
                <li key={i} className="relative">
                  <span className={`absolute -left-[37px] flex size-6 items-center justify-center rounded-full ring-4 ring-surface ${e.success ? "bg-success-soft text-success-fg" : "bg-surface-2 text-muted"}`}>
                    <e.icon className="size-3.5" />
                  </span>
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted">{formatDateTime(e.at)} · {e.detail}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
