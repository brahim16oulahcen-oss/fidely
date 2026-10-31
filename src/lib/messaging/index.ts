/**
 * Adaptateurs d'envoi. En mode démo, DemoMessagingProvider n'envoie rien :
 * il renvoie un statut « simulated » (journalisé par l'appelant).
 */
import { env } from "@/config/env";
import type { Channel } from "@/types/domain";

export interface OutgoingMessage {
  channel: Channel;
  to: string;
  subject?: string;
  body: string;
}

export interface MessagingProvider {
  id: "demo" | "production";
  label: string;
  send(msg: OutgoingMessage): Promise<{ status: "simulated" | "queued"; providerId?: string }>;
}

export const DemoMessagingProvider: MessagingProvider = {
  id: "demo",
  label: "Simulation (aucun envoi réel)",
  async send() {
    return { status: "simulated" };
  },
};

/** À implémenter : Brevo / Postmark (email), Twilio / OVH (SMS), APNs / Google Wallet API (notifications). */
export const ProductionMessagingProvider: MessagingProvider = {
  id: "production",
  label: "Production",
  async send() {
    throw new Error("Intégration à configurer : aucun fournisseur d'envoi n'est branché (voir docs/INTEGRATIONS.md).");
  },
};

export function getMessagingProvider(): MessagingProvider {
  return env.demoMode ? DemoMessagingProvider : ProductionMessagingProvider;
}
