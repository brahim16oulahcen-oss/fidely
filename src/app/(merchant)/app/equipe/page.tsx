import { Check, Minus } from "lucide-react";
import { requireMerchantPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { getPlan } from "@/config/plans";
import { listTeam } from "@/features/merchants/service";
import { ROLE_LABEL, ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { InviteMemberDialog, MemberRoleSelect, RemoveMemberButton } from "@/components/settings/team-controls";
import { formatRelative } from "@/lib/utils/format";
import { env } from "@/config/env";

export const metadata = { title: "Équipe" };

const PERM_LABEL: Partial<Record<Permission, string>> = {
  scan: "Scanner et attribuer", redeem: "Valider les récompenses", "customers.read": "Consulter les clients", "customers.write": "Modifier les clients", "customers.export": "Exporter les données",
  "programs.manage": "Gérer programmes et récompenses", "campaigns.manage": "Campagnes marketing", "analytics.read": "Tableau de bord et analytics", "team.manage": "Gérer l'équipe", "billing.manage": "Abonnement et facturation",
};

export default async function TeamPage() {
  const ctx = await requireMerchantPage("team.manage");
  const team = await listTeam({ ...ctx, repos: getRepos() });
  const plan = getPlan(ctx.merchant.planId);
  const staffCount = team.filter((m) => m.role !== "owner").length;
  return (
    <>
      <PageHeader title="Équipe" description={`${staffCount} / ${plan.limits.staff} employé${plan.limits.staff > 1 ? "s" : ""} inclus dans l'offre ${plan.name}.`} actions={<InviteMemberDialog disabled={staffCount >= plan.limits.staff} demo={env.demoMode} />} />
      <Card>
        <Table>
          <THead><TR className="hover:bg-transparent"><TH>Membre</TH><TH>Rôle</TH><TH className="hidden md:table-cell">Dernière connexion</TH><TH /></TR></THead>
          <TBody>
            {team.map((m) => (
              <TR key={m.id}>
                <TD><div className="flex items-center gap-3"><Avatar name={m.name} className="size-8" /><div><p className="font-medium">{m.name}{m.id === ctx.actor.userId && <span className="text-muted"> (vous)</span>}</p><p className="text-xs text-muted">{m.email}</p></div></div></TD>
                <TD>{m.role === "owner" ? <Badge variant="night">{ROLE_LABEL.owner}</Badge> : <MemberRoleSelect userId={m.id} role={m.role} />}</TD>
                <TD className="hidden md:table-cell text-muted">{formatRelative(m.lastLoginAt)}</TD>
                <TD className="text-right">{m.role !== "owner" && <RemoveMemberButton userId={m.id} name={m.name} />}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
      <Card className="mt-6">
        <CardHeader><CardTitle>Droits par rôle</CardTitle></CardHeader>
        <CardContent className="px-0">
          <Table>
            <THead><TR className="hover:bg-transparent"><TH>Permission</TH>{(["owner", "manager", "staff"] as const).map((r) => <TH key={r} className="text-center">{ROLE_LABEL[r]}</TH>)}</TR></THead>
            <TBody>
              {(Object.keys(PERM_LABEL) as Permission[]).map((p) => (
                <TR key={p}>
                  <TD>{PERM_LABEL[p]}</TD>
                  {(["owner", "manager", "staff"] as const).map((r) => <TD key={r} className="text-center">{ROLE_PERMISSIONS[r].includes(p) ? <Check className="mx-auto size-4 text-success" aria-label="Oui" /> : <Minus className="mx-auto size-4 text-muted" aria-label="Non" />}</TD>)}
                </TR>
              ))}
            </TBody>
          </Table>
          <p className="px-5 pt-3 text-xs text-muted">Les droits sont vérifiés côté serveur pour chaque action, quel que soit l&apos;affichage.</p>
        </CardContent>
      </Card>
    </>
  );
}
