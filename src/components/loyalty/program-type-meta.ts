import { Stamp, Coins, PiggyBank, Crown } from "lucide-react";
import type * as React from "react";
import type { ProgramType } from "@/types/domain";

/** Métadonnées d'affichage des types de programme — module partagé serveur/client. */
export const TYPE_META: Record<ProgramType, { icon: React.ComponentType<{ className?: string }>; description: string; example: string }> = {
  stamps: { icon: Stamp, description: "Un tampon par passage, une récompense au bout de N passages.", example: "10 cafés = 1 café offert" },
  points: { icon: Coins, description: "Des points proportionnels au montant, échangeables contre des récompenses.", example: "1 € = 1 point · 150 pts = 1 coupe" },
  cashback: { icon: PiggyBank, description: "Un pourcentage de l'achat devient un crédit utilisable en caisse.", example: "5 % reversés en crédit fidélité" },
  tiers: { icon: Crown, description: "Des niveaux Bronze, Silver, Gold avec des avantages croissants.", example: "Gold dès 800 points : ×1,5" },
};
