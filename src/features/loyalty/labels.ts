import type { Transaction } from "@/types/domain";

export function txTitle(t: Pick<Transaction, "kind">) {
  switch (t.kind) {
    case "earn": return "Passage en caisse";
    case "redeem": return "Récompense utilisée";
    case "cashback_use": return "Crédit utilisé";
    case "welcome": return "Bonus de bienvenue";
    case "adjust": return "Ajustement";
  }
}

export function txDelta(t: Pick<Transaction, "stampsDelta" | "pointsDelta" | "cashbackDeltaCents" | "kind">) {
  const parts: string[] = [];
  if (t.stampsDelta) parts.push(`${t.stampsDelta > 0 ? "+" : ""}${t.stampsDelta} tampon${Math.abs(t.stampsDelta) > 1 ? "s" : ""}`);
  if (t.pointsDelta) parts.push(`${t.pointsDelta > 0 ? "+" : ""}${t.pointsDelta} pts`);
  if (t.cashbackDeltaCents) parts.push(`${t.cashbackDeltaCents > 0 ? "+" : "−"}${(Math.abs(t.cashbackDeltaCents) / 100).toFixed(2).replace(".", ",")} €`);
  return parts.join(" · ") || (t.kind === "redeem" ? "Récompense" : "—");
}
