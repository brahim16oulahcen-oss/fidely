import "server-only";
import { env } from "@/config/env";
import { AppError } from "@/lib/auth/permissions";
import { getRepos } from "@/lib/db";
import { resetDemoDatabase } from "@/lib/db/demo-store";
import { DEMO_ADMIN, DEMO_CUSTOMER_EMAIL } from "./fixtures";

export type DemoRole = "admin" | "merchant" | "staff" | "customer";

export const DEMO_PROFILES: Record<DemoRole, { label: string; description: string; email?: string }> = {
  admin: { label: "Administrateur SaaS", description: "Back-office Fidely : commerçants, MRR, support.", email: DEMO_ADMIN.email },
  merchant: { label: "Commerçant", description: "Julien Moreau — Café Rouen Centre & Maison du Pain.", email: "julien@demo.fidely.example" },
  staff: { label: "Employé", description: "Lucas Petit — scanner du Café Rouen Centre.", email: "lucas@demo.fidely.example" },
  customer: { label: "Client final", description: "Léa Martin — carte du Café Rouen Centre.", email: DEMO_CUSTOMER_EMAIL },
};

function assertDemo() {
  // Garde-fou : le sélecteur de rôle n'existe pas hors mode démo.
  if (!env.demoMode) throw new AppError("FORBIDDEN", "Le mode démonstration est désactivé.");
}

export async function resolveDemoProfile(role: DemoRole) {
  assertDemo();
  const repos = getRepos();
  if (role === "customer") {
    const customer = await repos.customers.findOne({ email: DEMO_CUSTOMER_EMAIL, merchantId: "mer_cafe" });
    const card = customer ? await repos.cards.findOne({ customerId: customer.id, status: "active" }) : null;
    if (!card) throw new AppError("NOT_FOUND", "Carte de démonstration introuvable — réinitialisez la démo.");
    return { kind: "customer" as const, token: card.token };
  }
  const user = await repos.users.findOne({ email: DEMO_PROFILES[role].email! });
  if (!user) throw new AppError("NOT_FOUND", "Profil de démonstration introuvable — réinitialisez la démo.");
  // Seuls les comptes du jeu de démonstration sont accessibles via le sélecteur.
  if (!user.email.endsWith("@demo.fidely.example")) throw new AppError("FORBIDDEN", "Profil non autorisé.");
  return { kind: "user" as const, user };
}

export function resetDemo() {
  assertDemo();
  resetDemoDatabase();
}
