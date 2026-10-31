import { BookOpen, Coffee, Croissant, Flower2, Gem, Heart, Pizza, Scissors, ShoppingBag, Sparkles, Store, UtensilsCrossed, Wine, Dumbbell, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const LOGO_ICONS: Record<string, LucideIcon> = {
  Coffee, Scissors, Croissant, Sparkles, UtensilsCrossed, Pizza, Flower2, BookOpen, Store, ShoppingBag, Wine, Gem, Heart, Dumbbell,
};

export function MerchantLogo({
  icon,
  imageDataUrl,
  background,
  color,
  className,
  name,
}: {
  icon: string;
  imageDataUrl?: string;
  background: string;
  color: string;
  className?: string;
  name: string;
}) {
  const Icon = LOGO_ICONS[icon] ?? Store;
  return (
    <span
      className={cn("inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-black/5", className)}
      style={{ background, color }}
      role="img"
      aria-label={`Logo ${name}`}
    >
      {imageDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageDataUrl} alt="" className="size-full object-cover" />
      ) : (
        <Icon className="size-1/2" aria-hidden />
      )}
    </span>
  );
}

export function FidelyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#111827" />
      <path d="M10 22V10h10" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M10 16h7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="22" cy="21" r="3" fill="#4F46E5" />
    </svg>
  );
}
