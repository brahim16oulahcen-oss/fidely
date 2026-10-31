/**
 * Module de calcul des indicateurs — fonctions pures, réutilisées par le dashboard,
 * la page Analytics et l'administration. Chaque indicateur est défini dans METRICS.
 */
import type { Customer, LoyaltyCard, Program, Reward, RewardIssuance, Store, Transaction } from "@/types/domain";
import { DAY_MS, isoDay } from "@/lib/utils/dates";
import { segmentOf, SEGMENT_RULES } from "@/features/customers/segments";

export interface DateRange {
  from: Date;
  to: Date;
}

export const METRICS = {
  totalCustomers: { label: "Total clients", definition: "Membres inscrits (hors comptes supprimés) à la fin de la période." },
  newCustomers: { label: "Nouveaux clients", definition: "Inscriptions enregistrées pendant la période." },
  visits: { label: "Visites", definition: "Passages en caisse validés (attribution de tampons, points ou cashback) pendant la période." },
  loyalCustomers: { label: "Clients fidèles", definition: `Clients actifs ayant au moins ${SEGMENT_RULES.loyalVisits} passages au total.` },
  inactiveCustomers: { label: "Clients inactifs", definition: `Clients sans passage depuis plus de ${SEGMENT_RULES.inactiveDays} jours.` },
  rewardsRedeemed: { label: "Récompenses utilisées", definition: "Récompenses remises en caisse pendant la période." },
  returnRate: { label: "Taux de retour", definition: "Part des clients venus pendant la période qui étaient déjà venus auparavant (au moins une visite antérieure)." },
  revenueRecorded: { label: "CA enregistré", definition: "Somme des montants d'achat saisis lors des passages en caisse via Fidely. Ce n'est pas le chiffre d'affaires total du commerce." },
  revenueMembers: { label: "CA des clients fidèles", definition: `Part du CA enregistré réalisée par des clients ayant déjà ${SEGMENT_RULES.loyalVisits} passages ou plus au moment de l'achat.` },
  revenueIncremental: { label: "CA additionnel estimé", definition: "Estimation : CA des visites de retour × taux d'attribution choisi (paramètres). Hypothèse non mesurée — nécessiterait un groupe témoin." },
  avgBasket: { label: "Panier moyen", definition: "CA enregistré ÷ nombre de visites avec montant." },
} as const;

export function rangeFromPreset(preset: string | undefined, from?: string, to?: string, now = new Date()): DateRange & { preset: string } {
  if (preset === "custom" && from && to) {
    const f = new Date(`${from}T00:00:00`);
    const t = new Date(`${to}T23:59:59`);
    if (!isNaN(f.getTime()) && !isNaN(t.getTime()) && f <= t) return { from: f, to: t, preset };
  }
  const days = preset === "7" ? 7 : preset === "90" ? 90 : 30;
  const end = new Date(now);
  const start = new Date(now.getTime() - days * DAY_MS);
  start.setHours(0, 0, 0, 0);
  return { from: start, to: end, preset: String(days) };
}

export function previousRange(r: DateRange): DateRange {
  const len = r.to.getTime() - r.from.getTime();
  return { from: new Date(r.from.getTime() - len), to: new Date(r.from.getTime()) };
}

const within = (iso: string, r: DateRange) => {
  const t = new Date(iso).getTime();
  return t >= r.from.getTime() && t <= r.to.getTime();
};

export interface Dataset {
  customers: Customer[];
  cards: LoyaltyCard[];
  transactions: Transaction[];
  issuances: RewardIssuance[];
  rewards: Reward[];
  programs: Program[];
  stores: Store[];
}

export interface Kpis {
  totalCustomers: number;
  newCustomers: number;
  visits: number;
  loyalCustomers: number;
  inactiveCustomers: number;
  activeCustomers: number;
  rewardsRedeemed: number;
  rewardsUnlocked: number;
  returnRate: number;
  revenueRecorded: number;
  revenueMembers: number;
  revenueIncremental: number;
  avgBasket: number;
}

export function computeKpis(d: Dataset, r: DateRange, attributionRate = 0.2, now = r.to): Kpis {
  const live = d.customers.filter((c) => !c.deletedAt);
  const cardBy = new Map(d.cards.map((c) => [c.customerId, c]));
  const earn = d.transactions.filter((t) => t.kind === "earn");
  const inRange = earn.filter((t) => within(t.createdAt, r));

  let loyal = 0, inactive = 0, active = 0;
  for (const c of live) {
    if (new Date(c.createdAt) > r.to) continue;
    const card = cardBy.get(c.id);
    if (!card) continue;
    const s = segmentOf(c, card, now);
    if (s.includes("loyal")) loyal++;
    if (s.includes("inactive")) inactive++;
    else active++;
  }

  // Rang de chaque visite par client (pour taux de retour et CA des fidèles).
  const sorted = [...earn].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const visitIndex = new Map<string, number>();
  const counter = new Map<string, number>();
  for (const t of sorted) {
    const n = (counter.get(t.customerId) ?? 0) + 1;
    counter.set(t.customerId, n);
    visitIndex.set(t.id, n);
  }
  const visitorsInRange = new Set(inRange.map((t) => t.customerId));
  const returning = new Set(inRange.filter((t) => (visitIndex.get(t.id) ?? 1) > 1).map((t) => t.customerId));
  const withAmount = inRange.filter((t) => t.amountCents);
  const revenue = withAmount.reduce((s, t) => s + (t.amountCents ?? 0), 0);
  const revenueMembers = withAmount.filter((t) => (visitIndex.get(t.id) ?? 1) > SEGMENT_RULES.loyalVisits).reduce((s, t) => s + (t.amountCents ?? 0), 0);
  const repeatRevenue = withAmount.filter((t) => (visitIndex.get(t.id) ?? 1) > 1).reduce((s, t) => s + (t.amountCents ?? 0), 0);

  return {
    totalCustomers: live.filter((c) => new Date(c.createdAt) <= r.to).length,
    newCustomers: live.filter((c) => within(c.createdAt, r)).length + d.customers.filter((c) => c.deletedAt && within(c.createdAt, r)).length,
    visits: inRange.length,
    loyalCustomers: loyal,
    inactiveCustomers: inactive,
    activeCustomers: active,
    rewardsRedeemed: d.issuances.filter((i) => i.status === "redeemed" && i.redeemedAt && within(i.redeemedAt, r)).length,
    rewardsUnlocked: d.issuances.filter((i) => within(i.unlockedAt, r)).length,
    returnRate: visitorsInRange.size ? returning.size / visitorsInRange.size : 0,
    revenueRecorded: revenue,
    revenueMembers,
    revenueIncremental: Math.round(repeatRevenue * attributionRate),
    avgBasket: withAmount.length ? Math.round(revenue / withAmount.length) : 0,
  };
}

export function delta(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return (current - previous) / previous;
}

function buckets(r: DateRange) {
  const days = Math.ceil((r.to.getTime() - r.from.getTime()) / DAY_MS);
  const weekly = days > 62;
  const out: { key: string; label: string; start: number; end: number }[] = [];
  const step = weekly ? 7 : 1;
  for (let t = r.from.getTime(); t <= r.to.getTime(); t += step * DAY_MS) {
    const d = new Date(t);
    out.push({
      key: isoDay(d),
      label: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      start: t,
      end: Math.min(t + step * DAY_MS, r.to.getTime() + 1),
    });
  }
  return out;
}

export function timeSeries(d: Dataset, r: DateRange) {
  const b = buckets(r);
  const tally = (dates: number[]) => {
    const counts = new Array(b.length).fill(0);
    for (const t of dates) {
      const i = b.findIndex((x) => t >= x.start && t < x.end);
      if (i >= 0) counts[i]++;
    }
    return counts;
  };
  const signups = tally(d.customers.map((c) => new Date(c.createdAt).getTime()));
  const visits = tally(d.transactions.filter((t) => t.kind === "earn").map((t) => new Date(t.createdAt).getTime()));
  const redemptions = tally(d.issuances.filter((i) => i.redeemedAt).map((i) => new Date(i.redeemedAt!).getTime()));
  const unlocks = tally(d.issuances.map((i) => new Date(i.unlockedAt).getTime()));
  const startCount = d.customers.filter((c) => new Date(c.createdAt).getTime() < r.from.getTime()).length;
  let cum = startCount;
  return b.map((x, i) => {
    cum += signups[i];
    return { date: x.label, inscriptions: signups[i], visites: visits[i], utilisees: redemptions[i], debloquees: unlocks[i], membres: cum };
  });
}

export function visitFrequency(d: Dataset) {
  const bins = [
    { label: "1 visite", min: 1, max: 1 },
    { label: "2–4", min: 2, max: 4 },
    { label: "5–9", min: 5, max: 9 },
    { label: "10–19", min: 10, max: 19 },
    { label: "20+", min: 20, max: Infinity },
  ];
  return bins.map((b) => ({ tranche: b.label, clients: d.cards.filter((c) => c.visits >= b.min && c.visits <= b.max).length }));
}

export function popularRewards(d: Dataset, r?: DateRange) {
  const names = new Map(d.rewards.map((x) => [x.id, x.name]));
  const count = new Map<string, { utilisees: number; debloquees: number }>();
  for (const i of d.issuances) {
    const e = count.get(i.rewardId) ?? { utilisees: 0, debloquees: 0 };
    if (!r || within(i.unlockedAt, r)) e.debloquees++;
    if (i.status === "redeemed" && i.redeemedAt && (!r || within(i.redeemedAt, r))) e.utilisees++;
    count.set(i.rewardId, e);
  }
  return [...count.entries()]
    .map(([id, v]) => ({ id, name: names.get(id) ?? "—", ...v }))
    .sort((a, b) => b.utilisees - a.utilisees);
}

export function byStore(d: Dataset, r: DateRange) {
  return d.stores.map((s) => {
    const tx = d.transactions.filter((t) => t.storeId === s.id && t.kind === "earn" && within(t.createdAt, r));
    return { name: s.name, visites: tx.length, ca: tx.reduce((sum, t) => sum + (t.amountCents ?? 0), 0) / 100 };
  });
}

export function byProgram(d: Dataset) {
  return d.programs.map((p) => ({
    name: p.name,
    type: p.type,
    membres: d.cards.filter((c) => c.programId === p.id).length,
    visites: d.transactions.filter((t) => t.programId === p.id && t.kind === "earn").length,
  }));
}

export function returnRateSeries(d: Dataset, r: DateRange) {
  const earn = [...d.transactions.filter((t) => t.kind === "earn")].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const firstVisit = new Map<string, number>();
  for (const t of earn) if (!firstVisit.has(t.customerId)) firstVisit.set(t.customerId, new Date(t.createdAt).getTime());
  return buckets(r).map((b) => {
    const visitors = new Set<string>();
    const returning = new Set<string>();
    for (const t of earn) {
      const tt = new Date(t.createdAt).getTime();
      if (tt < b.start || tt >= b.end) continue;
      visitors.add(t.customerId);
      if ((firstVisit.get(t.customerId) ?? tt) < tt) returning.add(t.customerId);
    }
    return { date: b.label, taux: visitors.size ? Math.round((returning.size / visitors.size) * 1000) / 10 : 0 };
  });
}
