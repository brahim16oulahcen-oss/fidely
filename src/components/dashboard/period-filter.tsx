"use client";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RangeCalendar, type DateRange } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const PRESETS = [
  { id: "7", label: "7 jours" },
  { id: "30", label: "30 jours" },
  { id: "90", label: "90 jours" },
];

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PeriodFilter({ current, from, to }: { current: string; from?: string; to?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>(from && to ? { from: new Date(from), to: new Date(to) } : undefined);

  const apply = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) v === null ? sp.delete(k) : sp.set(k, v);
    start(() => router.push(`${pathname}?${sp.toString()}`, { scroll: false }));
  };

  return (
    <div className={cn("flex items-center gap-1 rounded-lg border border-border bg-surface p-1 shadow-xs", pending && "opacity-70")} role="group" aria-label="Période">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => apply({ periode: p.id, du: null, au: null })}
          aria-pressed={current === p.id}
          className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", current === p.id ? "bg-[#111827] text-white dark:bg-white dark:text-[#111827]" : "text-muted hover:text-foreground")}
        >
          {p.label}
        </button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            aria-pressed={current === "custom"}
            className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", current === "custom" ? "bg-[#111827] text-white dark:bg-white dark:text-[#111827]" : "text-muted hover:text-foreground")}
          >
            <CalendarDays className="size-4" />
            {current === "custom" && from && to ? `${new Date(from).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${new Date(to).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : "Personnalisée"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto">
          <RangeCalendar value={range} onChange={setRange} max={new Date()} />
          <div className="mt-2 flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              size="sm"
              disabled={!range?.from || !range?.to}
              onClick={() => {
                if (range?.from && range?.to) apply({ periode: "custom", du: toIso(range.from), au: toIso(range.to) });
                setOpen(false);
              }}
            >
              Appliquer
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
