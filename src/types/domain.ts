/**
 * Modèle de domaine Fidely. Chaque entité métier porte un merchantId
 * (périmètre du locataire) — voir supabase/migrations pour le schéma SQL.
 */

export type ID = string;
export type ISODate = string;

export type PlanId = "starter" | "pro" | "business";
export type ProgramType = "stamps" | "points" | "cashback" | "tiers";
export type Tier = "bronze" | "silver" | "gold";
export type MerchantStatus = "active" | "trial" | "suspended" | "cancelled";
export type UserRole = "admin" | "owner" | "manager" | "staff";
export type Channel = "email" | "sms" | "wallet";
export type MerchantCategory = "cafe" | "barber" | "bakery" | "beauty" | "restaurant" | "florist" | "bookshop" | "other";

export interface BrandColors {
  primary: string; // couleur de fond de la carte
  text: string; // couleur du texte de la carte
  accent: string; // tampons / progression
}

export interface Merchant {
  id: ID;
  slug: string;
  name: string;
  category: MerchantCategory;
  description: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  siret?: string;
  logo: { icon: string; imageDataUrl?: string };
  colors: BrandColors;
  planId: PlanId;
  status: MerchantStatus;
  primaryProgramId: ID | null;
  onboardingCompleted: boolean;
  suspendedReason?: string;
  settings: {
    minSecondsBetweenVisits: number; // anti-fraude : délai minimal entre deux passages
    maxAmountCents: number; // montant maximal saisi par opération
    retentionMonths: number; // conservation des données clients inactifs
    attributionRate: number; // hypothèse d'attribution (analytics)
  };
  createdAt: ISODate;
  isDemoSeed: boolean;
}

export interface Store {
  id: ID;
  merchantId: ID;
  name: string;
  address: string;
  createdAt: ISODate;
}

export interface Membership {
  merchantId: ID;
  role: Exclude<UserRole, "admin">;
}

export interface User {
  id: ID;
  email: string;
  name: string;
  passwordHash: string;
  isPlatformAdmin: boolean;
  memberships: Membership[];
  emailVerified: boolean;
  verificationCode?: string;
  resetToken?: string;
  createdAt: ISODate;
  lastLoginAt?: ISODate;
}

export interface CardDesign {
  title: string;
  background: string;
  text: string;
  accent: string;
  showLogo: boolean;
  rewardText: string;
  terms: string;
}

export interface StampsRules {
  type: "stamps";
  stampsRequired: number;
  stampsPerVisit: number;
  rewardName: string;
  rewardValidityDays: number;
}
export interface PointsRules {
  type: "points";
  pointsPerEuro: number;
  welcomePoints: number;
}
export interface CashbackRules {
  type: "cashback";
  percent: number;
  minPurchaseCents: number;
  maxCreditPerTxCents: number;
}
export interface TiersRules {
  type: "tiers";
  pointsPerEuro: number;
  silverThreshold: number; // points cumulés
  goldThreshold: number;
  multipliers: Record<Tier, number>;
  benefits: Record<Tier, string>;
}
export type ProgramRules = StampsRules | PointsRules | CashbackRules | TiersRules;

export interface Program {
  id: ID;
  merchantId: ID;
  name: string;
  type: ProgramType;
  status: "active" | "inactive";
  rules: ProgramRules;
  ruleVersion: number;
  card: CardDesign;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Reward {
  id: ID;
  merchantId: ID;
  programId: ID;
  name: string;
  description: string;
  cost: number; // en tampons ou points selon le programme ; 0 = offert (ex : anniversaire)
  validityDays: number;
  quantity: number | null; // null = illimité
  issuedCount: number;
  active: boolean;
  autoUnlock: boolean;
  createdAt: ISODate;
}

export interface ConsentState {
  email: boolean;
  sms: boolean;
  wallet: boolean;
  updatedAt: ISODate;
}

export interface Customer {
  id: ID;
  merchantId: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthday?: string; // MM-DD
  consent: ConsentState;
  createdAt: ISODate;
  source: "qr" | "web" | "staff" | "import";
  deletedAt?: ISODate;
}

export interface LoyaltyCard {
  id: ID;
  merchantId: ID;
  programId: ID;
  customerId: ID;
  /** Jeton secret (URL de la carte côté client). Jamais affiché au commerçant. */
  token: string;
  /** Code de scan (contenu du QR). Aucune donnée personnelle. */
  scanCode: string;
  stamps: number;
  points: number;
  lifetimePoints: number;
  cashbackCents: number;
  tier: Tier;
  visits: number;
  totalSpentCents: number;
  lastVisitAt: ISODate | null;
  createdAt: ISODate;
  status: "active" | "revoked";
}

export type TransactionKind = "earn" | "redeem" | "cashback_use" | "welcome" | "adjust";

export interface Transaction {
  id: ID;
  merchantId: ID;
  storeId: ID;
  programId: ID;
  cardId: ID;
  customerId: ID;
  kind: TransactionKind;
  amountCents: number | null;
  stampsDelta: number;
  pointsDelta: number;
  cashbackDeltaCents: number;
  rewardId?: ID;
  issuanceId?: ID;
  /** Version des règles appliquées : l'historique n'est jamais recalculé. */
  ruleVersion: number;
  ruleSummary: string;
  actorUserId: ID | null;
  idempotencyKey: string;
  createdAt: ISODate;
  note?: string;
}

export interface RewardIssuance {
  id: ID;
  merchantId: ID;
  rewardId: ID;
  cardId: ID;
  customerId: ID;
  status: "available" | "redeemed" | "expired";
  unlockedAt: ISODate;
  expiresAt: ISODate;
  redeemedAt?: ISODate;
  redeemedBy?: ID;
  redeemTransactionId?: ID;
}

export type SegmentId = "all" | "new" | "active" | "loyal" | "vip" | "inactive";

export type AutomationTrigger = "inactive_30" | "birthday" | "reward_available" | "new_member" | "special_offer";

export interface Campaign {
  id: ID;
  merchantId: ID;
  name: string;
  channel: Channel;
  segment: SegmentId;
  subject?: string;
  message: string;
  status: "draft" | "scheduled" | "sent" | "cancelled";
  scheduledAt?: ISODate;
  sentAt?: ISODate;
  createdAt: ISODate;
  createdBy: ID | null;
  automation?: AutomationTrigger;
  stats: {
    targeted: number;
    excludedNoConsent: number;
    simulatedDelivered: number;
    simulatedOpened: number;
    simulatedClicked: number;
    attributedVisits: number;
  };
}

export interface Automation {
  id: ID;
  merchantId: ID;
  trigger: AutomationTrigger;
  enabled: boolean;
  channel: Channel;
  message: string;
  lastRunAt?: ISODate;
}

export interface MessageLog {
  id: ID;
  merchantId: ID;
  campaignId: ID;
  customerId: ID;
  channel: Channel;
  status: "simulated" | "skipped_no_consent";
  preview: string;
  createdAt: ISODate;
}

export interface Subscription {
  merchantId: ID;
  planId: PlanId;
  status: "active" | "trialing" | "past_due" | "cancelled";
  startedAt: ISODate;
  currentPeriodEnd: ISODate;
  cancelledAt?: ISODate;
  provider: "demo" | "stripe";
}

export interface Invoice {
  id: ID;
  merchantId: ID;
  number: string;
  planId: PlanId;
  amountCents: number;
  issuedAt: ISODate;
  periodStart: ISODate;
  periodEnd: ISODate;
  status: "paid" | "open" | "void";
}

export interface AuditLog {
  id: ID;
  actorUserId: ID | null;
  actorLabel: string;
  merchantId: ID | null;
  action: string;
  target: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: ISODate;
}

export interface ConsentLog {
  id: ID;
  merchantId: ID;
  customerId: ID;
  channel: Channel | "program";
  granted: boolean;
  source: string;
  createdAt: ISODate;
}

export interface SupportTicket {
  id: ID;
  merchantId: ID;
  subject: string;
  body: string;
  status: "open" | "pending" | "resolved";
  priority: "low" | "normal" | "high";
  kind: "question" | "incident" | "billing";
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface DemoDatabase {
  version: number;
  seededAt: ISODate;
  merchants: Merchant[];
  stores: Store[];
  users: User[];
  programs: Program[];
  rewards: Reward[];
  customers: Customer[];
  cards: LoyaltyCard[];
  transactions: Transaction[];
  issuances: RewardIssuance[];
  campaigns: Campaign[];
  automations: Automation[];
  messageLogs: MessageLog[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  consentLogs: ConsentLog[];
  tickets: SupportTicket[];
}
