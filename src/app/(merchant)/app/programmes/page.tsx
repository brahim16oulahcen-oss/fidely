import Link from "next/link";
import { Plus, Users, Footprints, Gift, History, CreditCard } from "lucide-react";
import { requireMerchantPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { getPlan } from "@/config/plans";
import { describeRules, PROGRAM_TYPE_LABEL } from "@/features/loyalty/engine";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgramFormDialog, ProgramStatusToggle } from "@/components/loyalty/program-dialogs";
import { TYPE_META } from "@/components/loyalty/program-type-meta";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { DAY_MS } from "@/lib/utils/dates";

export const metadata = { title: "Programmes" };

export default async function ProgramsPage() {
  const { merchant } = await requireMerchantPage("programs.manage");
  const repos = getRepos();
  const plan = getPlan(merchant.planId);
  const [programs, cards, txs, issuances, logs] = await Promise.all([
    repos.programs.findMany({ merchantId: merchant.id }),
    repos.cards.findMany({ merchantId: merchant.id }),
    repos.transactions.findMany({ merchantId: merchant.id }),
    repos.issuances.findMany({ merchantId: merchant.id }),
    repos.auditLogs.findMany({ merchantId: merchant.id, action: "program.rules_updated" }),
  ]);
  const since = Date.now() - 30 * DAY_MS;
  return (
    <>
      <PageHeader
        title="Programmes de fidélité"
        description={`Votre offre ${plan.name} inclut ${plan.limits.programs} programme${plan.limits.programs > 1 ? "s" : ""} : ${plan.programTypes.map((t) => PROGRAM_TYPE_LABEL[t]).join(", ")}.`}
        actions={
          programs.length < plan.limits.programs ? (
            <ProgramFormDialog allowedTypes={plan.programTypes} trigger={<Button><Plus /> Nouveau programme</Button>} />
          ) : (
            <Button variant="outline" asChild><Link href="/app/abonnement">Plus de programmes avec une offre supérieure</Link></Button>
          )
        }
      />
      <div className="space-y-4">
        {programs.map((p) => {
          const M = TYPE_META[p.type];
          const pCards = cards.filter((c) => c.programId === p.id);
          const visits30 = txs.filter((t) => t.programId === p.id && t.kind === "earn" && new Date(t.createdAt).getTime() > since).length;
          const cardIds = new Set(pCards.map((c) => c.id));
          const redeemed = issuances.filter((i) => cardIds.has(i.cardId) && i.status === "redeemed").length;
          const available = issuances.filter((i) => cardIds.has(i.cardId) && i.status === "available").length;
          const history = logs.filter((l) => l.target === p.name).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return (
            <Card key={p.id} data-testid="program-card">
              <CardContent className="grid gap-5 pt-5 lg:grid-cols-[1fr_auto]">
                <div className="flex gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl" style={{ background: p.card.background, color: p.card.accent }}><M.icon className="size-6" /></span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{p.name}</h2>
                      <Badge variant="outline">{PROGRAM_TYPE_LABEL[p.type]}</Badge>
                      {merchant.primaryProgramId === p.id && <Badge>Programme d&apos;inscription</Badge>}
                      <Badge variant="neutral">Règles v{p.ruleVersion}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{describeRules(p.rules)}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-1.5"><Users className="size-4 text-muted" /> {formatNumber(pCards.length)} membres</span>
                      <span className="inline-flex items-center gap-1.5"><Footprints className="size-4 text-muted" /> {formatNumber(visits30)} visites / 30 j</span>
                      <span className="inline-flex items-center gap-1.5"><Gift className="size-4 text-muted" /> {formatNumber(redeemed)} utilisées · {formatNumber(available)} disponibles</span>
                    </div>
                    {history.length > 0 && (
                      <details className="mt-3 text-sm">
                        <summary className="inline-flex cursor-pointer items-center gap-1.5 text-muted hover:text-foreground"><History className="size-4" /> Historique des règles</summary>
                        <ul className="mt-2 space-y-1 pl-6 text-muted">
                          {history.map((h) => <li key={h.id}>{formatDate(h.createdAt)} · v{String(h.metadata?.version ?? "?")} : {String(h.metadata?.from)} → <span className="text-foreground">{String(h.metadata?.to)}</span></li>)}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <ProgramStatusToggle program={p} isPrimary={merchant.primaryProgramId === p.id} />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild><Link href={`/app/cartes?programme=${p.id}`}><CreditCard /> Carte</Link></Button>
                    <Button variant="outline" size="sm" asChild><Link href="/app/recompenses"><Gift /> Récompenses</Link></Button>
                    <ProgramFormDialog program={p} allowedTypes={plan.programTypes} trigger={<Button size="sm">Modifier</Button>} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
