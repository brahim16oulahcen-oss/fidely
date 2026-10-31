import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { merchantAdminDetail } from "@/features/admin/service";
import { AppError } from "@/lib/auth/permissions";
import { PLANS } from "@/config/plans";
import { describeRules, PROGRAM_TYPE_LABEL } from "@/features/loyalty/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { MerchantLogo } from "@/components/loyalty/merchant-logo";
import { MerchantStatusBadge } from "@/components/admin/merchant-status-badge";
import { AdminPlanSelect, SuspendControls } from "@/components/admin/admin-controls";
import { formatDate, formatDateTime, formatEuros, formatNumber, formatRelative } from "@/lib/utils/format";

export default async function AdminMerchantDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminPage();
  const { id } = await params;
  let d;
  try {
    d = await merchantAdminDetail(getRepos(), user, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const m = d.merchant;
  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3"><Link href="/admin/commercants"><ArrowLeft /> Commerçants</Link></Button>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <MerchantLogo icon={m.logo.icon} imageDataUrl={m.logo.imageDataUrl} background={m.colors.primary} color={m.colors.text} name={m.name} className="size-14 rounded-2xl" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{m.name}</h1>
          <p className="text-sm text-muted">{m.address}, {m.postalCode} {m.city} · créé le {formatDate(m.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2"><MerchantStatusBadge status={m.status} /><SuspendControls merchantId={m.id} status={m.status} name={m.name} /></div>
      </div>
      {m.status === "suspended" && <Alert variant="danger" className="mb-4" title="Compte suspendu">{m.suspendedReason}</Alert>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Abonnement (fictif)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted">Offre</span><AdminPlanSelect merchantId={m.id} planId={m.planId} /></div>
            <div className="flex justify-between"><span className="text-muted">Prix</span><span>{formatEuros(PLANS[m.planId].priceCents)} / mois</span></div>
            <div className="flex justify-between"><span className="text-muted">Statut</span><span>{d.subscription?.status ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Échéance</span><span>{d.subscription ? formatDate(d.subscription.currentPeriodEnd) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Propriétaire</span><span>{d.owner?.name} · {d.owner?.email}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Utilisation</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Clients</span><span className="tabular">{formatNumber(d.customers)} / {formatNumber(PLANS[m.planId].limits.customers)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Transactions totales</span><span className="tabular">{formatNumber(d.transactions)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Transactions 30 j</span><span className="tabular">{formatNumber(d.transactions30)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Dernière activité</span><span>{formatRelative(d.lastActivity)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Établissements</span><span>{d.stores.length}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Programmes</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {d.programs.map((p) => <div key={p.id}><p className="font-medium">{p.name} <Badge variant="outline">{PROGRAM_TYPE_LABEL[p.type]}</Badge> {p.status !== "active" && <Badge variant="neutral">Inactif</Badge>}</p><p className="text-muted">{describeRules(p.rules)}</p></div>)}
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Incidents et demandes</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">{d.tickets.map((t) => <li key={t.id} className="rounded-lg border border-border p-3"><div className="flex justify-between gap-2"><span className="font-medium">{t.subject}</span><Badge variant={t.status === "resolved" ? "success" : t.kind === "incident" ? "danger" : "default"}>{t.kind} · {t.status}</Badge></div><p className="mt-1 text-muted">{t.body}</p><p className="text-xs text-muted">{formatDateTime(t.createdAt)}</p></li>)}{d.tickets.length === 0 && <li className="text-muted">Aucun incident.</li>}</ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Journal d&apos;audit</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">{d.logs.map((l) => <li key={l.id} className="flex justify-between gap-3"><span><span className="font-mono text-xs">{l.action}</span> · {l.target}</span><span className="shrink-0 text-xs text-muted">{l.actorLabel} · {formatDateTime(l.createdAt)}</span></li>)}</ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
