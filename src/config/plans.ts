import type { PlanId, ProgramType } from "@/types/domain";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceCents: number;
  description: string;
  highlight?: boolean;
  limits: {
    customers: number;
    staff: number;
    stores: number;
    programs: number;
  };
  programTypes: ProgramType[];
  features: {
    analyticsAdvanced: boolean;
    automations: boolean;
    campaigns: boolean;
    segmentationAdvanced: boolean;
    multiStore: boolean;
    teamManagement: boolean;
  };
  bullets: string[];
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceCents: 1900,
    description: "Pour lancer sa première carte de fidélité digitale.",
    limits: { customers: 200, staff: 1, stores: 1, programs: 1 },
    programTypes: ["stamps"],
    features: {
      analyticsAdvanced: false,
      automations: false,
      campaigns: false,
      segmentationAdvanced: false,
      multiStore: false,
      teamManagement: false,
    },
    bullets: ["Jusqu'à 200 clients", "Programme à tampons", "Cartes digitales", "Scanner", "Statistiques essentielles"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceCents: 3900,
    description: "Pour fidéliser activement et faire revenir ses clients.",
    highlight: true,
    limits: { customers: 2000, staff: 5, stores: 1, programs: 3 },
    programTypes: ["stamps", "points", "cashback"],
    features: {
      analyticsAdvanced: true,
      automations: true,
      campaigns: true,
      segmentationAdvanced: false,
      multiStore: false,
      teamManagement: true,
    },
    bullets: [
      "Jusqu'à 2 000 clients",
      "Programmes à points et cashback",
      "Récompenses avancées",
      "Analytics",
      "Automatisations marketing",
      "Jusqu'à 5 employés",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    priceCents: 7900,
    description: "Pour les enseignes avec plusieurs établissements.",
    limits: { customers: 10000, staff: 50, stores: 10, programs: 10 },
    programTypes: ["stamps", "points", "cashback", "tiers"],
    features: {
      analyticsAdvanced: true,
      automations: true,
      campaigns: true,
      segmentationAdvanced: true,
      multiStore: true,
      teamManagement: true,
    },
    bullets: [
      "Jusqu'à 10 000 clients",
      "Plusieurs établissements",
      "Tous les programmes, dont niveaux VIP",
      "Segmentation avancée",
      "Gestion d'équipe",
      "Analytics avancées",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["starter", "pro", "business"];

export function getPlan(id: PlanId): PlanDefinition {
  return PLANS[id];
}

export const PLAN_COMPARISON: { label: string; values: Record<PlanId, string | boolean> }[] = [
  { label: "Clients inclus", values: { starter: "200", pro: "2 000", business: "10 000" } },
  { label: "Établissements", values: { starter: "1", pro: "1", business: "Jusqu'à 10" } },
  { label: "Employés", values: { starter: "1", pro: "5", business: "50" } },
  { label: "Programme à tampons", values: { starter: true, pro: true, business: true } },
  { label: "Programme à points", values: { starter: false, pro: true, business: true } },
  { label: "Cashback fidélité", values: { starter: false, pro: true, business: true } },
  { label: "Niveaux VIP", values: { starter: false, pro: false, business: true } },
  { label: "Cartes digitales web", values: { starter: true, pro: true, business: true } },
  { label: "Scanner employé", values: { starter: true, pro: true, business: true } },
  { label: "Campagnes email / SMS", values: { starter: false, pro: true, business: true } },
  { label: "Automatisations marketing", values: { starter: false, pro: true, business: true } },
  { label: "Analytics avancées", values: { starter: false, pro: true, business: true } },
  { label: "Segmentation avancée", values: { starter: false, pro: false, business: true } },
  { label: "Export CSV", values: { starter: true, pro: true, business: true } },
];
