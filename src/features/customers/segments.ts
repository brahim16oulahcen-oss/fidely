import type { Customer, LoyaltyCard, SegmentId } from "@/types/domain";
import { DAY_MS } from "@/lib/utils/dates";

/** Définitions des segments — utilisées partout (CRM, campagnes, analytics). */
export const SEGMENT_RULES = {
  newDays: 30,
  inactiveDays: 45,
  loyalVisits: 5,
  vipVisits: 12,
} as const;

export const SEGMENTS: Record<SegmentId, { label: string; description: string }> = {
  all: { label: "Tous les membres", description: "Tous les clients inscrits au programme." },
  new: { label: "Nouveaux", description: `Inscrits depuis moins de ${SEGMENT_RULES.newDays} jours.` },
  active: { label: "Actifs", description: `Au moins un passage au cours des ${SEGMENT_RULES.inactiveDays} derniers jours.` },
  loyal: { label: "Fidèles", description: `Actifs avec au moins ${SEGMENT_RULES.loyalVisits} passages.` },
  vip: { label: "VIP", description: `Au moins ${SEGMENT_RULES.vipVisits} passages ou niveau Gold.` },
  inactive: { label: "Inactifs", description: `Aucun passage depuis plus de ${SEGMENT_RULES.inactiveDays} jours.` },
};

export function segmentOf(
  customer: Pick<Customer, "createdAt">,
  card: Pick<LoyaltyCard, "visits" | "lastVisitAt" | "tier">,
  now: Date = new Date(),
): SegmentId[] {
  const t = now.getTime();
  const out: SegmentId[] = ["all"];
  const age = (t - new Date(customer.createdAt).getTime()) / DAY_MS;
  const last = card.lastVisitAt ? (t - new Date(card.lastVisitAt).getTime()) / DAY_MS : Infinity;
  const active = last <= SEGMENT_RULES.inactiveDays || (card.visits === 0 && age <= SEGMENT_RULES.newDays);
  if (age <= SEGMENT_RULES.newDays) out.push("new");
  if (active) out.push("active");
  else out.push("inactive");
  if (active && card.visits >= SEGMENT_RULES.loyalVisits) out.push("loyal");
  if (card.visits >= SEGMENT_RULES.vipVisits || card.tier === "gold") out.push("vip");
  return out;
}

export type CustomerStatus = "vip" | "loyal" | "new" | "active" | "inactive";

export function primaryStatus(segments: SegmentId[]): CustomerStatus {
  if (segments.includes("inactive")) return "inactive";
  if (segments.includes("vip")) return "vip";
  if (segments.includes("loyal")) return "loyal";
  if (segments.includes("new")) return "new";
  return "active";
}

export const STATUS_LABEL: Record<CustomerStatus, string> = {
  vip: "VIP",
  loyal: "Fidèle",
  new: "Nouveau",
  active: "Actif",
  inactive: "Inactif",
};
