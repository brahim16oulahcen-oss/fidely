import { ArrowDownRight, ArrowUpRight, Info, Minus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  definition,
  hint,
  invertDelta,
  testId,
}: {
  label: string;
  value: string;
  delta?: number | null;
  icon: LucideIcon;
  definition?: string;
  hint?: string;
  invertDelta?: boolean;
  testId?: string;
}) {
  const positive = delta !== null && delta !== undefined && (invertDelta ? delta < 0 : delta > 0);
  const negative = delta !== null && delta !== undefined && (invertDelta ? delta > 0 : delta < 0);
  return (
    <Card className="p-4 md:p-5" data-testid={testId}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm text-muted">
          <span>{label}</span>
          {definition && (
            <Tooltip content={definition}>
              <button className="rounded text-muted/70 hover:text-foreground" aria-label={`Définition : ${label}`}>
                <Info className="size-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
        <span className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-muted">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-none tracking-tight tabular" data-testid={testId ? `${testId}-value` : undefined}>{value}</p>
      <div className="mt-2 flex h-5 items-center gap-1.5 text-xs">
        {delta !== undefined && (
          <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium", positive && "bg-success-soft text-success-fg", negative && "bg-danger-soft text-danger-fg", !positive && !negative && "bg-surface-2 text-muted")}>
            {delta === null ? <Minus className="size-3" /> : positive || (!negative && (delta ?? 0) > 0) ? <ArrowUpRight className="size-3" /> : negative ? <ArrowDownRight className="size-3" /> : <Minus className="size-3" />}
            {delta === null ? "nouveau" : `${delta > 0 ? "+" : ""}${(delta * 100).toFixed(0)} %`}
          </span>
        )}
        {hint && <span className="truncate text-muted">{hint}</span>}
      </div>
    </Card>
  );
}
