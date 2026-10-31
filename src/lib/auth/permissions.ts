import type { UserRole } from "@/types/domain";

export type Permission =
  | "scan"
  | "redeem"
  | "customers.read"
  | "customers.write"
  | "customers.export"
  | "programs.manage"
  | "rewards.manage"
  | "cards.manage"
  | "campaigns.manage"
  | "analytics.read"
  | "team.manage"
  | "settings.manage"
  | "billing.manage";

const ALL: Permission[] = [
  "scan",
  "redeem",
  "customers.read",
  "customers.write",
  "customers.export",
  "programs.manage",
  "rewards.manage",
  "cards.manage",
  "campaigns.manage",
  "analytics.read",
  "team.manage",
  "settings.manage",
  "billing.manage",
];

export const ROLE_PERMISSIONS: Record<Exclude<UserRole, "admin">, Permission[]> = {
  owner: ALL,
  manager: ALL.filter((p) => p !== "billing.manage" && p !== "team.manage"),
  staff: ["scan", "redeem", "customers.read"],
};

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrateur Fidely",
  owner: "Propriétaire",
  manager: "Responsable",
  staff: "Employé",
};

export interface Actor {
  userId: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
}

export interface MerchantActor extends Actor {
  merchantId: string;
  role: Exclude<UserRole, "admin">;
}

export function can(actor: Pick<MerchantActor, "role">, perm: Permission): boolean {
  return ROLE_PERMISSIONS[actor.role].includes(perm);
}

export class AppError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "LIMIT" | "SUSPENDED" | "RATE_LIMIT" | "NOT_CONFIGURED",
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function assertCan(actor: MerchantActor, perm: Permission) {
  if (!can(actor, perm)) throw new AppError("FORBIDDEN", "Vous n'avez pas les droits nécessaires pour cette action.");
}
