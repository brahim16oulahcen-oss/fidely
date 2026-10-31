"use server";
import { merchantAction } from "./_helpers";
import { earnInputSchema, idempotencyKeySchema } from "@/features/loyalty/schemas";
import { earn, redeemIssuance, redeemPointsReward, resolveScan, searchCards, snapshotCard, useCashback, loadOwnedCard, giftReward } from "@/features/loyalty/operations";
import { z } from "zod";

export async function searchCardsAction(query: string) {
  return merchantAction("scan", async (ctx) => {
    const results = await searchCards(ctx, String(query ?? "").slice(0, 80));
    return results.map(({ card, customer }) => ({
      cardId: card.id,
      name: `${customer.firstName} ${customer.lastName}`.trim(),
      email: customer.email.replace(/^(.{2}).*(@.*)$/, "$1•••$2"),
      lastVisitAt: card.lastVisitAt,
      scanCode: card.scanCode,
    }));
  });
}

export async function resolveScanAction(raw: string) {
  return merchantAction("scan", (ctx) => resolveScan(ctx, String(raw ?? "").slice(0, 200)));
}

export async function loadCardAction(cardId: string) {
  return merchantAction("scan", async (ctx) => snapshotCard(ctx.repos, await loadOwnedCard(ctx, String(cardId))));
}

export async function earnAction(input: z.input<typeof earnInputSchema>) {
  return merchantAction("scan", (ctx) => earn(ctx, earnInputSchema.parse(input)));
}

export async function redeemIssuanceAction(input: { issuanceId: string; idempotencyKey: string; storeId?: string }) {
  return merchantAction("redeem", (ctx) => redeemIssuance(ctx, z.object({ issuanceId: z.string().min(3), idempotencyKey: idempotencyKeySchema, storeId: z.string().optional() }).parse(input)));
}

export async function redeemPointsAction(input: { cardId: string; rewardId: string; idempotencyKey: string; storeId?: string }) {
  return merchantAction("redeem", (ctx) => redeemPointsReward(ctx, z.object({ cardId: z.string().min(3), rewardId: z.string().min(3), idempotencyKey: idempotencyKeySchema, storeId: z.string().optional() }).parse(input)));
}

export async function applyCashbackAction(input: { cardId: string; amountCents: number; idempotencyKey: string; storeId?: string }) {
  return merchantAction("redeem", (ctx) => useCashback(ctx, z.object({ cardId: z.string().min(3), amountCents: z.number().int().positive(), idempotencyKey: idempotencyKeySchema, storeId: z.string().optional() }).parse(input)));
}

export async function giftRewardAction(cardId: string, rewardId: string) {
  return merchantAction("customers.write", (ctx) => giftReward(ctx, { cardId: String(cardId), rewardId: String(rewardId) }).then(() => true), "Récompense offerte.");
}
