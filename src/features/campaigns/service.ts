import "server-only";
/**
 * Campagnes & automatisations. En mode démo, AUCUN message n'est expédié :
 * chaque envoi est inscrit dans le journal interne (messageLogs) avec le
 * statut « simulated ». Les clients sans consentement sur le canal sont exclus.
 */
import { z } from "zod";
import type { Repositories } from "@/lib/db/repository";
import { AppError, assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/utils/ids";
import { getPlan } from "@/config/plans";
import { DAY_MS } from "@/lib/utils/dates";
import type { AutomationTrigger, Campaign, Channel, Customer, Merchant, SegmentId } from "@/types/domain";
import type { MerchantCtx } from "@/features/loyalty/programs";
import { segmentOf } from "@/features/customers/segments";
import { getMessagingProvider } from "@/lib/messaging";

export const campaignSchema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(80),
  channel: z.enum(["email", "sms", "wallet"]),
  segment: z.enum(["all", "new", "active", "loyal", "vip", "inactive"]),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(5, "Message trop court").max(600, "Message trop long"),
  mode: z.enum(["draft", "send", "schedule"]),
  scheduledAt: z.string().optional(),
}).superRefine((v, ctx) => {
  if (v.channel === "sms" && v.message.length > 320) ctx.addIssue({ code: "custom", path: ["message"], message: "Un SMS est limité à 320 caractères (2 SMS)." });
  if (v.channel === "email" && !v.subject) ctx.addIssue({ code: "custom", path: ["subject"], message: "Objet requis pour un email" });
  if (v.mode === "schedule") {
    const t = v.scheduledAt ? new Date(v.scheduledAt).getTime() : NaN;
    if (!Number.isFinite(t) || t < Date.now() + 60_000) ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "Choisissez une date future" });
  }
});

export const CHANNEL_LABEL: Record<Channel, string> = { email: "Email", sms: "SMS", wallet: "Notification Wallet" };
export const AUTOMATION_LABEL: Record<AutomationTrigger, { title: string; description: string }> = {
  inactive_30: { title: "Client inactif depuis 30 jours", description: "Relance automatique des clients sans passage depuis 30 jours." },
  birthday: { title: "Anniversaire", description: "Message le jour de l'anniversaire du client (si renseigné)." },
  reward_available: { title: "Récompense disponible", description: "Prévenir le client qu'une récompense l'attend." },
  new_member: { title: "Nouveau membre", description: "Message de bienvenue après l'inscription." },
  special_offer: { title: "Offre spéciale", description: "Offre ponctuelle envoyée aux membres actifs." },
};

export function personalize(msg: string, c: Pick<Customer, "firstName">, merchant: Pick<Merchant, "name">) {
  return msg.replaceAll("{prenom}", c.firstName).replaceAll("{commerce}", merchant.name);
}

function assertMarketing(merchant: Merchant) {
  const plan = getPlan(merchant.planId);
  if (!plan.features.campaigns) throw new AppError("LIMIT", `Les campagnes ne sont pas incluses dans l'offre ${plan.name}. Passez à l'offre Pro.`);
}

export async function audienceFor(repos: Repositories, merchantId: string, segment: SegmentId, channel: Channel, now = new Date()) {
  const [customers, cards] = await Promise.all([repos.customers.findMany({ merchantId }), repos.cards.findMany({ merchantId, status: "active" })]);
  const cardBy = new Map(cards.map((c) => [c.customerId, c]));
  const eligible = customers.filter((c) => {
    if (c.deletedAt) return false;
    const card = cardBy.get(c.id);
    if (!card) return false;
    return segment === "all" || segmentOf(c, card, now).includes(segment);
  });
  const consenting = eligible.filter((c) => c.consent[channel]);
  return { eligible, consenting };
}

export async function estimateAudience(ctx: MerchantCtx, segment: SegmentId, channel: Channel) {
  assertCan(ctx.actor, "campaigns.manage");
  const { eligible, consenting } = await audienceFor(ctx.repos, ctx.merchant.id, segment, channel);
  return { eligible: eligible.length, consenting: consenting.length, excluded: eligible.length - consenting.length };
}

/** Score déterministe [0,1) pour simuler ouvertures/clics de façon reproductible. */
function pseudo(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

async function dispatch(repos: Repositories, merchant: Merchant, campaign: Campaign) {
  const { eligible, consenting } = await audienceFor(repos, merchant.id, campaign.segment, campaign.channel);
  const provider = getMessagingProvider();
  const ok = new Set(consenting.map((c) => c.id));
  const now = new Date().toISOString();
  let delivered = 0, opened = 0, clicked = 0;
  for (const c of eligible) {
    const allowed = ok.has(c.id);
    const preview = personalize(campaign.message, c, merchant).slice(0, 160);
    if (allowed) {
      await provider.send({ channel: campaign.channel, to: campaign.channel === "sms" ? c.phone : c.email, subject: campaign.subject, body: preview });
      const p = pseudo(campaign.id + c.id);
      if (p < 0.97) delivered++;
      if (campaign.channel === "email" && p < 0.42) opened++;
      if (p < 0.08) clicked++;
    }
    await repos.messageLogs.insert({
      id: newId("msg"),
      merchantId: merchant.id,
      campaignId: campaign.id,
      customerId: c.id,
      channel: campaign.channel,
      status: allowed ? "simulated" : "skipped_no_consent",
      preview,
      createdAt: now,
    });
  }
  return repos.campaigns.update(campaign.id, {
    status: "sent",
    sentAt: now,
    stats: {
      targeted: eligible.length,
      excludedNoConsent: eligible.length - consenting.length,
      simulatedDelivered: delivered,
      simulatedOpened: opened,
      simulatedClicked: clicked,
      attributedVisits: 0,
    },
  });
}

export async function createCampaign(ctx: MerchantCtx, raw: z.input<typeof campaignSchema>) {
  assertCan(ctx.actor, "campaigns.manage");
  assertMarketing(ctx.merchant);
  const input = campaignSchema.parse(raw);
  return ctx.repos.tx(async () => {
    const campaign: Campaign = {
      id: newId("cmp"),
      merchantId: ctx.merchant.id,
      name: input.name,
      channel: input.channel,
      segment: input.segment,
      subject: input.subject,
      message: input.message,
      status: input.mode === "schedule" ? "scheduled" : "draft",
      scheduledAt: input.mode === "schedule" ? new Date(input.scheduledAt!).toISOString() : undefined,
      createdAt: new Date().toISOString(),
      createdBy: ctx.actor.userId,
      stats: { targeted: 0, excludedNoConsent: 0, simulatedDelivered: 0, simulatedOpened: 0, simulatedClicked: 0, attributedVisits: 0 },
    };
    await ctx.repos.campaigns.insert(campaign);
    await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: `campaign.${input.mode === "send" ? "sent" : input.mode === "schedule" ? "scheduled" : "drafted"}`, target: campaign.name, metadata: { channel: campaign.channel, segment: campaign.segment, simulated: true } });
    if (input.mode === "send") return dispatch(ctx.repos, ctx.merchant, campaign);
    return campaign;
  });
}

export async function sendCampaignNow(ctx: MerchantCtx, campaignId: string) {
  assertCan(ctx.actor, "campaigns.manage");
  assertMarketing(ctx.merchant);
  const c = await ctx.repos.campaigns.findById(campaignId);
  if (!c || c.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Campagne introuvable.");
  if (c.status === "sent") throw new AppError("CONFLICT", "Cette campagne a déjà été envoyée.");
  return ctx.repos.withLock(`campaign:${c.id}`, () =>
    ctx.repos.tx(async () => {
      const fresh = (await ctx.repos.campaigns.findById(campaignId))!;
      if (fresh.status === "sent") throw new AppError("CONFLICT", "Cette campagne a déjà été envoyée.");
      await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "campaign.sent", target: c.name, metadata: { simulated: true } });
      return dispatch(ctx.repos, ctx.merchant, fresh);
    }),
  );
}

export async function cancelCampaign(ctx: MerchantCtx, campaignId: string) {
  assertCan(ctx.actor, "campaigns.manage");
  const c = await ctx.repos.campaigns.findById(campaignId);
  if (!c || c.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Campagne introuvable.");
  if (c.status === "sent") throw new AppError("CONFLICT", "Une campagne envoyée ne peut pas être annulée.");
  await ctx.repos.campaigns.update(c.id, { status: "cancelled" });
}

/** Les campagnes programmées échues sont traitées à la lecture (pas de worker en démo). */
export async function processDueCampaigns(repos: Repositories, merchant: Merchant) {
  const due = (await repos.campaigns.findMany({ merchantId: merchant.id, status: "scheduled" })).filter(
    (c) => c.scheduledAt && new Date(c.scheduledAt).getTime() <= Date.now(),
  );
  for (const c of due) await repos.tx(() => dispatch(repos, merchant, c));
}

export async function listCampaigns(ctx: MerchantCtx) {
  await processDueCampaigns(ctx.repos, ctx.merchant);
  const [campaigns, logs, txs] = await Promise.all([
    ctx.repos.campaigns.findMany({ merchantId: ctx.merchant.id }),
    ctx.repos.messageLogs.findMany({ merchantId: ctx.merchant.id, status: "simulated" }),
    ctx.repos.transactions.findMany({ merchantId: ctx.merchant.id, kind: "earn" }),
  ]);
  // Visites attribuées : passages réels (transactions) des destinataires dans les 7 jours suivant l'envoi.
  const recipients = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!recipients.has(l.campaignId)) recipients.set(l.campaignId, new Set());
    recipients.get(l.campaignId)!.add(l.customerId);
  }
  return campaigns
    .map((c) => {
      let attributedVisits = 0;
      if (c.sentAt) {
        const start = new Date(c.sentAt).getTime();
        const set = recipients.get(c.id);
        if (set) attributedVisits = txs.filter((t) => set.has(t.customerId) && new Date(t.createdAt).getTime() > start && new Date(t.createdAt).getTime() < start + 7 * DAY_MS).length;
      }
      return { ...c, stats: { ...c.stats, attributedVisits } };
    })
    .sort((a, b) => (b.sentAt ?? b.scheduledAt ?? b.createdAt).localeCompare(a.sentAt ?? a.scheduledAt ?? a.createdAt));
}

// ── Automatisations ────────────────────────────────────────────

export const automationSchema = z.object({
  enabled: z.boolean(),
  channel: z.enum(["email", "sms", "wallet"]),
  message: z.string().trim().min(5).max(320),
});

export async function updateAutomation(ctx: MerchantCtx, id: string, raw: unknown) {
  assertCan(ctx.actor, "campaigns.manage");
  const plan = getPlan(ctx.merchant.planId);
  if (!plan.features.automations) throw new AppError("LIMIT", `Les automatisations ne sont pas incluses dans l'offre ${plan.name}.`);
  const input = automationSchema.parse(raw);
  const a = await ctx.repos.automations.findById(id);
  if (!a || a.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Automatisation introuvable.");
  await ctx.repos.automations.update(id, input);
  await audit(ctx.repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: input.enabled ? "automation.enabled" : "automation.updated", target: AUTOMATION_LABEL[a.trigger].title });
}

async function automationAudience(repos: Repositories, merchant: Merchant, trigger: AutomationTrigger, now = new Date()) {
  const [customers, cards, issuances] = await Promise.all([
    repos.customers.findMany({ merchantId: merchant.id }),
    repos.cards.findMany({ merchantId: merchant.id, status: "active" }),
    repos.issuances.findMany({ merchantId: merchant.id, status: "available" }),
  ]);
  const cardBy = new Map(cards.map((c) => [c.customerId, c]));
  const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const withReward = new Set(issuances.filter((i) => new Date(i.expiresAt) > now).map((i) => i.customerId));
  return customers.filter((c) => {
    if (c.deletedAt) return false;
    const card = cardBy.get(c.id);
    if (!card) return false;
    switch (trigger) {
      case "inactive_30": {
        const last = card.lastVisitAt ? (now.getTime() - new Date(card.lastVisitAt).getTime()) / DAY_MS : 0;
        return last >= 30 && last < 60;
      }
      case "birthday":
        return c.birthday === mmdd;
      case "reward_available":
        return withReward.has(c.id);
      case "new_member":
        return (now.getTime() - new Date(c.createdAt).getTime()) / DAY_MS <= 7;
      case "special_offer":
        return segmentOf(c, card, now).includes("active");
    }
  });
}

export async function previewAutomation(ctx: MerchantCtx, id: string) {
  assertCan(ctx.actor, "campaigns.manage");
  const a = await ctx.repos.automations.findById(id);
  if (!a || a.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Automatisation introuvable.");
  const audience = await automationAudience(ctx.repos, ctx.merchant, a.trigger);
  return { eligible: audience.length, consenting: audience.filter((c) => c.consent[a.channel]).length };
}

/** Exécution manuelle (en production : tâche planifiée quotidienne). */
export async function runAutomationNow(ctx: MerchantCtx, id: string) {
  assertCan(ctx.actor, "campaigns.manage");
  const plan = getPlan(ctx.merchant.planId);
  if (!plan.features.automations) throw new AppError("LIMIT", `Les automatisations ne sont pas incluses dans l'offre ${plan.name}.`);
  const a = await ctx.repos.automations.findById(id);
  if (!a || a.merchantId !== ctx.merchant.id) throw new AppError("NOT_FOUND", "Automatisation introuvable.");
  if (!a.enabled) throw new AppError("VALIDATION", "Activez l'automatisation avant de l'exécuter.");
  const audience = await automationAudience(ctx.repos, ctx.merchant, a.trigger);
  return ctx.repos.tx(async () => {
    const campaign: Campaign = {
      id: newId("cmp"),
      merchantId: ctx.merchant.id,
      name: `Automatisation · ${AUTOMATION_LABEL[a.trigger].title}`,
      channel: a.channel,
      segment: "all",
      subject: AUTOMATION_LABEL[a.trigger].title,
      message: a.message,
      status: "sent",
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: ctx.actor.userId,
      automation: a.trigger,
      stats: { targeted: 0, excludedNoConsent: 0, simulatedDelivered: 0, simulatedOpened: 0, simulatedClicked: 0, attributedVisits: 0 },
    };
    await ctx.repos.campaigns.insert(campaign);
    const consenting = audience.filter((c) => c.consent[a.channel]);
    for (const c of audience) {
      await ctx.repos.messageLogs.insert({
        id: newId("msg"),
        merchantId: ctx.merchant.id,
        campaignId: campaign.id,
        customerId: c.id,
        channel: a.channel,
        status: c.consent[a.channel] ? "simulated" : "skipped_no_consent",
        preview: personalize(a.message, c, ctx.merchant).slice(0, 160),
        createdAt: campaign.sentAt!,
      });
    }
    await ctx.repos.campaigns.update(campaign.id, {
      stats: { ...campaign.stats, targeted: audience.length, excludedNoConsent: audience.length - consenting.length, simulatedDelivered: consenting.length },
    });
    await ctx.repos.automations.update(a.id, { lastRunAt: campaign.sentAt });
    return { targeted: audience.length, sent: consenting.length, excluded: audience.length - consenting.length };
  });
}

/** Déclenchement événementiel (ex : nouveau membre) — journalisé, jamais réellement envoyé en démo. */
export async function triggerAutomation(repos: Repositories, merchant: Merchant, trigger: AutomationTrigger, customers: Customer[]) {
  const plan = getPlan(merchant.planId);
  if (!plan.features.automations) return;
  const a = await repos.automations.findOne({ merchantId: merchant.id, trigger });
  if (!a?.enabled) return;
  for (const c of customers) {
    await repos.messageLogs.insert({
      id: newId("msg"),
      merchantId: merchant.id,
      campaignId: a.id,
      customerId: c.id,
      channel: a.channel,
      status: c.consent[a.channel] ? "simulated" : "skipped_no_consent",
      preview: personalize(a.message, c, merchant).slice(0, 160),
      createdAt: new Date().toISOString(),
    });
  }
}
