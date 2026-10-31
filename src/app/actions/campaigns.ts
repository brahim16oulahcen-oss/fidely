"use server";
import { merchantAction } from "./_helpers";
import { cancelCampaign, createCampaign, estimateAudience, previewAutomation, runAutomationNow, sendCampaignNow, updateAutomation, type campaignSchema } from "@/features/campaigns/service";
import type { Channel, SegmentId } from "@/types/domain";
import type { z } from "zod";

export async function estimateAudienceAction(segment: SegmentId, channel: Channel) {
  return merchantAction("campaigns.manage", (ctx) => estimateAudience(ctx, segment, channel));
}
export async function createCampaignAction(input: z.input<typeof campaignSchema>) {
  return merchantAction("campaigns.manage", async (ctx) => {
    const c = await createCampaign(ctx, input);
    return { id: c.id, status: c.status, sent: c.stats.simulatedDelivered, excluded: c.stats.excludedNoConsent };
  });
}
export async function sendCampaignNowAction(id: string) {
  return merchantAction("campaigns.manage", async (ctx) => {
    const c = await sendCampaignNow(ctx, String(id));
    return { sent: c.stats.simulatedDelivered, excluded: c.stats.excludedNoConsent };
  });
}
export async function cancelCampaignAction(id: string) {
  return merchantAction("campaigns.manage", (ctx) => cancelCampaign(ctx, String(id)), "Campagne annulée.");
}
export async function updateAutomationAction(id: string, input: unknown) {
  return merchantAction("campaigns.manage", (ctx) => updateAutomation(ctx, String(id), input), "Automatisation enregistrée.");
}
export async function previewAutomationAction(id: string) {
  return merchantAction("campaigns.manage", (ctx) => previewAutomation(ctx, String(id)));
}
export async function runAutomationAction(id: string) {
  return merchantAction("campaigns.manage", (ctx) => runAutomationNow(ctx, String(id)));
}
