/**
 * Facturation. DemoBillingProvider : aucun paiement, factures fictives marquées DEMO.
 * StripeBillingProvider : squelette documenté (Checkout + Customer Portal + webhooks).
 */
import { env } from "@/config/env";
import type { PlanId } from "@/types/domain";

export interface BillingProvider {
  id: "demo" | "stripe";
  label: string;
  isConfigured(): boolean;
  changePlan(input: { merchantId: string; planId: PlanId }): Promise<{ status: "applied" | "redirect"; url?: string }>;
}

export const DemoBillingProvider: BillingProvider = {
  id: "demo",
  label: "Facturation simulée (aucun paiement)",
  isConfigured: () => true,
  async changePlan() {
    return { status: "applied" };
  },
};

export const StripeBillingProvider: BillingProvider = {
  id: "stripe",
  label: "Stripe",
  isConfigured: () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
  async changePlan() {
    // Production : créer une session Stripe Checkout (mode subscription) avec STRIPE_PRICE_<PLAN>,
    // puis appliquer le changement uniquement à réception du webhook customer.subscription.updated.
    throw new Error("Intégration à configurer : Stripe n'est pas branché (voir docs/INTEGRATIONS.md).");
  },
};

export function getBillingProvider(): BillingProvider {
  return env.demoMode ? DemoBillingProvider : StripeBillingProvider;
}
