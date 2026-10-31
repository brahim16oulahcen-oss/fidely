import Link from "next/link";
import { Plus, Megaphone, Lock } from "lucide-react";
import { requireMerchantPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { getPlan } from "@/config/plans";
import { AUTOMATION_LABEL, CHANNEL_LABEL, listCampaigns } from "@/features/campaigns/service";
import { SEGMENTS } from "@/features/customers/segments";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutomationCard, CampaignRowActions } from "@/components/campaigns/campaign-controls";
import { formatDateTime, formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Campagnes" };

const STATUS: Record<string, { label: string; v: "success" | "default" | "neutral" | "warning" }> = {
  sent: { label: "Envoyée (simulation)", v: "success" },
  scheduled: { label: "Programmée", v: "default" },
  draft: { label: "Brouillon", v: "neutral" },
  cancelled: { label: "Annulée", v: "warning" },
};

export default async function CampaignsPage() {
  const ctx = await requireMerchantPage("campaigns.manage");
  const plan = getPlan(ctx.merchant.planId);
  if (!plan.features.campaigns) {
    return (
      <>
        <PageHeader title="Campagnes marketing" description="Relancez vos clients par email, SMS ou notification Wallet." />
        <EmptyState icon={Lock} title={`Non inclus dans l'offre ${plan.name}`} description="Les campagnes et automatisations marketing sont disponibles à partir de l'offre Pro (39 €/mois)." action={<Button asChild><Link href="/app/abonnement">Voir les offres</Link></Button>} />
      </>
    );
  }
  const repos = getRepos();
  const campaigns = await listCampaigns({ ...ctx, repos });
  const automations = await repos.automations.findMany({ merchantId: ctx.merchant.id });
  const logs = (await repos.messageLogs.findMany({ merchantId: ctx.merchant.id })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40);
  const customers = new Map((await repos.customers.findMany({ merchantId: ctx.merchant.id })).map((c) => [c.id, c]));
  const campaignName = new Map([...campaigns.map((c) => [c.id, c.name] as const), ...automations.map((a) => [a.id, `Automatisation · ${AUTOMATION_LABEL[a.trigger].title}`] as const)]);
  const manual = campaigns.filter((c) => !c.automation);

  return (
    <>
      <PageHeader title="Campagnes marketing" description="Relancez vos clients au bon moment, dans le respect de leurs consentements." actions={<Button asChild><Link href="/app/campagnes/nouvelle"><Plus /> Nouvelle campagne</Link></Button>} />
      <Alert variant="demo" className="mb-4" title="Envois simulés">En mode démonstration, aucun message n&apos;est expédié. Chaque envoi est inscrit dans le journal ci-dessous ; ouvertures et clics sont simulés, les visites attribuées sont calculées sur les vrais passages.</Alert>
      <Tabs defaultValue="campagnes">
        <TabsList>
          <TabsTrigger value="campagnes">Campagnes</TabsTrigger>
          <TabsTrigger value="automatisations">Automatisations</TabsTrigger>
          <TabsTrigger value="journal">Journal d&apos;envois</TabsTrigger>
        </TabsList>
        <TabsContent value="campagnes">
          <Card>
            {manual.length === 0 ? (
              <EmptyState className="m-4" icon={Megaphone} title="Aucune campagne" description="Créez votre première campagne." action={<Button asChild><Link href="/app/campagnes/nouvelle">Créer une campagne</Link></Button>} />
            ) : (
              <Table>
                <THead><TR className="hover:bg-transparent"><TH>Campagne</TH><TH className="hidden md:table-cell">Audience</TH><TH>Statut</TH><TH className="text-right">Destinataires</TH><TH className="hidden lg:table-cell text-right">Exclus</TH><TH className="hidden lg:table-cell text-right">Ouvertures*</TH><TH className="text-right">Visites attribuées</TH><TH /></TR></THead>
                <TBody>
                  {manual.map((c) => (
                    <TR key={c.id} data-testid="campaign-row">
                      <TD>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted">{CHANNEL_LABEL[c.channel]} · {formatDateTime(c.sentAt ?? c.scheduledAt ?? c.createdAt)}</p>
                      </TD>
                      <TD className="hidden md:table-cell text-muted">{SEGMENTS[c.segment].label}</TD>
                      <TD><Badge variant={STATUS[c.status].v}>{STATUS[c.status].label}</Badge></TD>
                      <TD className="text-right tabular">{c.status === "sent" ? formatNumber(c.stats.simulatedDelivered) : "—"}</TD>
                      <TD className="hidden lg:table-cell text-right tabular text-muted">{c.status === "sent" ? formatNumber(c.stats.excludedNoConsent) : "—"}</TD>
                      <TD className="hidden lg:table-cell text-right tabular text-muted">{c.status === "sent" && c.channel === "email" ? formatNumber(c.stats.simulatedOpened) : "—"}</TD>
                      <TD className="text-right tabular font-medium">{c.status === "sent" ? formatNumber(c.stats.attributedVisits) : "—"}</TD>
                      <TD><CampaignRowActions id={c.id} status={c.status} /></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
            <p className="border-t border-border px-4 py-2 text-xs text-muted">* Ouvertures simulées. Visites attribuées : passages réels des destinataires dans les 7 jours suivant l&apos;envoi.</p>
          </Card>
        </TabsContent>
        <TabsContent value="automatisations">
          <Card>
            <CardHeader><CardTitle>Automatisations</CardTitle><CardDescription>Messages déclenchés par un événement. Seuls les clients ayant consenti au canal sont concernés.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {automations.map((a) => (
                <AutomationCard key={a.id} id={a.id} title={AUTOMATION_LABEL[a.trigger].title} description={AUTOMATION_LABEL[a.trigger].description} enabled={a.enabled} channel={a.channel} message={a.message} lastRunAt={a.lastRunAt} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="journal">
          <Card>
            <Table>
              <THead><TR className="hover:bg-transparent"><TH>Date</TH><TH>Client</TH><TH className="hidden md:table-cell">Origine</TH><TH>Canal</TH><TH>Statut</TH><TH className="hidden lg:table-cell">Aperçu</TH></TR></THead>
              <TBody>
                {logs.map((l) => {
                  const c = customers.get(l.customerId);
                  return (
                    <TR key={l.id}>
                      <TD className="whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</TD>
                      <TD>{c ? `${c.firstName} ${c.lastName}` : "—"}</TD>
                      <TD className="hidden md:table-cell text-muted">{campaignName.get(l.campaignId) ?? "—"}</TD>
                      <TD>{CHANNEL_LABEL[l.channel]}</TD>
                      <TD>{l.status === "simulated" ? <Badge variant="demo">Simulation</Badge> : <Badge variant="neutral">Exclu (consentement)</Badge>}</TD>
                      <TD className="hidden max-w-xs truncate lg:table-cell text-muted">{l.preview}</TD>
                    </TR>
                  );
                })}
                {logs.length === 0 && <TR><TD colSpan={6} className="text-center text-muted">Journal vide.</TD></TR>}
              </TBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
