import { Check, Crown, Gift } from "lucide-react";
import type { CardDesign, ProgramRules, Tier } from "@/types/domain";
import { MerchantLogo } from "@/components/loyalty/merchant-logo";
import { QrCode } from "@/components/loyalty/qr-code";
import { cn } from "@/lib/utils/cn";

export interface CardVisualProps {
  merchantName: string;
  logo: { icon: string; imageDataUrl?: string };
  design: CardDesign;
  rules: ProgramRules;
  balances: { stamps: number; points: number; lifetimePoints: number; cashbackCents: number; tier: Tier };
  customerName?: string;
  scanCode?: string;
  variant?: "web" | "iphone" | "android";
  nextRewardLabel?: string;
  progressRatio?: number;
  className?: string;
}

const TIER_STYLE: Record<Tier, { label: string; bg: string }> = {
  bronze: { label: "Bronze", bg: "linear-gradient(135deg,#b45309,#d97706)" },
  silver: { label: "Silver", bg: "linear-gradient(135deg,#64748b,#cbd5e1)" },
  gold: { label: "Gold", bg: "linear-gradient(135deg,#b45309,#facc15)" },
};

function euros(c: number) {
  return (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function primaryValue(rules: ProgramRules, b: CardVisualProps["balances"]) {
  switch (rules.type) {
    case "stamps":
      return { label: "Tampons", value: `${b.stamps}/${rules.stampsRequired}` };
    case "points":
      return { label: "Points", value: b.points.toLocaleString("fr-FR") };
    case "cashback":
      return { label: "Crédit", value: euros(b.cashbackCents) };
    case "tiers":
      return { label: "Points", value: b.points.toLocaleString("fr-FR") };
  }
}

export function StampsGrid({ count, filled, accent, text, size = "md" }: { count: number; filled: number; accent: string; text: string; size?: "sm" | "md" }) {
  const cols = count <= 6 ? count : count <= 10 ? 5 : count <= 12 ? 6 : 8;
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-label={`${filled} tampons sur ${count}`}>
      {Array.from({ length: count }, (_, i) => {
        const on = i < filled;
        const last = i === count - 1;
        return (
          <span
            key={i}
            className={cn("flex aspect-square items-center justify-center rounded-full border-2 transition-all", size === "sm" ? "max-w-7" : "max-w-10")}
            style={{ borderColor: on ? accent : `${text}40`, background: on ? accent : "transparent", color: on ? "#111827" : `${text}80` }}
          >
            {on ? <Check className="size-[55%]" strokeWidth={3} /> : last ? <Gift className="size-[50%]" /> : null}
          </span>
        );
      })}
    </div>
  );
}

export function LoyaltyCardVisual(p: CardVisualProps) {
  const variant = p.variant ?? "web";
  const { design: d, rules, balances: b } = p;
  const main = primaryValue(rules, b);
  const ratio = Math.max(0, Math.min(1, p.progressRatio ?? 0));

  if (variant === "iphone") {
    return (
      <div className={cn("w-full overflow-hidden rounded-[18px] shadow-xl", p.className)} style={{ background: d.background, color: d.text }} data-testid="card-iphone">
        <div className="flex items-center gap-2 px-4 pt-4">
          {d.showLogo && <MerchantLogo icon={p.logo.icon} imageDataUrl={p.logo.imageDataUrl} background={`${d.text}18`} color={d.text} name={p.merchantName} className="size-8 rounded-lg" />}
          <span className="truncate text-sm font-semibold">{p.merchantName}</span>
          <div className="ml-auto text-right">
            <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{main.label}</p>
            <p className="text-lg font-semibold leading-tight tabular">{main.value}</p>
          </div>
        </div>
        <div className="mt-3 px-4 py-4" style={{ background: `${d.text}10` }}>
          {rules.type === "stamps" ? (
            <StampsGrid count={rules.stampsRequired} filled={b.stamps} accent={d.accent} text={d.text} size="sm" />
          ) : (
            <p className="text-2xl font-semibold tracking-tight">{d.title}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 py-3 text-xs">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70">Membre</p>
            <p className="truncate font-medium">{p.customerName ?? "Prénom Nom"}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{rules.type === "tiers" ? "Niveau" : "Récompense"}</p>
            <p className="truncate font-medium">{rules.type === "tiers" ? TIER_STYLE[b.tier].label : d.rewardText || "—"}</p>
          </div>
        </div>
        <div className="flex justify-center px-4 pb-5 pt-1">
          <div className="rounded-xl bg-white p-2">
            {p.scanCode ? <QrCode value={p.scanCode} label="QR code de la carte" className="size-28" /> : <div className="size-28 rounded bg-slate-100" />}
            <p className="mt-1 text-center font-mono text-[9px] text-slate-500">{p.scanCode ?? "FDL-XXXX-XXXX-XXXX"}</p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "android") {
    return (
      <div className={cn("w-full overflow-hidden rounded-[24px] shadow-xl", p.className)} style={{ background: d.background, color: d.text }} data-testid="card-android">
        <div className="flex items-center gap-3 px-5 pt-5">
          {d.showLogo && <MerchantLogo icon={p.logo.icon} imageDataUrl={p.logo.imageDataUrl} background={`${d.text}20`} color={d.text} name={p.merchantName} className="size-9 rounded-full" />}
          <span className="truncate text-sm font-medium opacity-90">{p.merchantName}</span>
        </div>
        <div className="px-5 pb-2 pt-4">
          <p className="text-xl font-medium">{d.title}</p>
          <div className="mt-4 flex gap-8 text-sm">
            <div>
              <p className="text-xs opacity-70">{main.label}</p>
              <p className="text-lg font-medium tabular">{main.value}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs opacity-70">{rules.type === "tiers" ? "Niveau" : "Récompense"}</p>
              <p className="truncate text-lg font-medium">{rules.type === "tiers" ? TIER_STYLE[b.tier].label : d.rewardText || "—"}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center pb-6 pt-4">
          <div className="rounded-2xl bg-white p-3">
            {p.scanCode ? <QrCode value={p.scanCode} label="QR code de la carte" className="size-32" /> : <div className="size-32 rounded bg-slate-100" />}
          </div>
        </div>
      </div>
    );
  }

  // Carte web Fidely
  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-[22px] p-5 shadow-[0_20px_50px_-20px_rgba(17,24,39,0.45)]", p.className)}
      style={{ background: `radial-gradient(120% 140% at 100% 0%, ${d.accent}33 0%, transparent 45%), ${d.background}`, color: d.text }}
      data-testid="card-web"
    >
      <div className="flex items-start gap-3">
        {d.showLogo && <MerchantLogo icon={p.logo.icon} imageDataUrl={p.logo.imageDataUrl} background={`${d.text}15`} color={d.text} name={p.merchantName} className="size-11" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wider opacity-70">{p.merchantName}</p>
          <p className="truncate text-lg font-semibold tracking-tight">{d.title}</p>
        </div>
        {rules.type === "tiers" && (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow" style={{ background: TIER_STYLE[b.tier].bg }}>
            <Crown className="size-3" /> {TIER_STYLE[b.tier].label}
          </span>
        )}
      </div>

      <div className="mt-5">
        {rules.type === "stamps" ? (
          <StampsGrid count={rules.stampsRequired} filled={b.stamps} accent={d.accent} text={d.text} />
        ) : (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-70">{main.label}</p>
            <p className="text-4xl font-semibold tracking-tight tabular" data-testid="card-balance">{main.value}</p>
          </div>
        )}
      </div>

      {rules.type !== "cashback" && (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: `${d.text}25` }}>
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${ratio * 100}%`, background: d.accent }} />
          </div>
          {p.nextRewardLabel && <p className="mt-2 text-xs opacity-80">{p.nextRewardLabel}</p>}
        </div>
      )}

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider opacity-60">Membre</p>
          <p className="truncate text-sm font-medium">{p.customerName ?? "Prénom Nom"}</p>
          <p className="mt-0.5 font-mono text-[10px] opacity-60">{p.scanCode ?? "FDL-XXXX-XXXX-XXXX"}</p>
        </div>
        {p.scanCode !== undefined && (
          <div className="rounded-xl bg-white p-1.5 shadow">
            <QrCode value={p.scanCode} label="QR code à présenter en caisse" className="size-20" />
          </div>
        )}
      </div>
    </div>
  );
}

export function PhoneFrame({ children, className, os = "ios" }: { children: React.ReactNode; className?: string; os?: "ios" | "android" }) {
  return (
    <div className={cn("relative mx-auto w-[280px] rounded-[44px] border-[10px] border-[#0b0f19] bg-[#f2f2f7] p-3 pt-10 shadow-2xl dark:bg-[#1c1c1e]", os === "android" && "rounded-[36px] bg-[#f1f3f4]", className)}>
      <div className={cn("absolute left-1/2 top-2 h-5 -translate-x-1/2 rounded-full bg-[#0b0f19]", os === "ios" ? "w-24" : "w-3")} />
      <p className="mb-2 px-1 text-[11px] font-semibold text-slate-500">{os === "ios" ? "Cartes" : "Google Wallet"}</p>
      {children}
    </div>
  );
}
