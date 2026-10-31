import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { PLANS, PLAN_ORDER, PLAN_COMPARISON } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function PricingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLAN_ORDER.map((id) => {
        const p = PLANS[id];
        return (
          <div key={id} className={cn("relative flex flex-col rounded-2xl border bg-surface p-6", p.highlight ? "border-primary shadow-[0_20px_50px_-25px_rgba(79,70,229,0.55)]" : "border-border")}>
            {p.highlight && <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">Le plus choisi</span>}
            <p className="text-sm font-semibold">{p.name}</p>
            <p className="mt-3"><span className="text-4xl font-semibold tracking-tight">{p.priceCents / 100} €</span><span className="text-sm text-muted"> HT / mois</span></p>
            <p className="mt-2 text-sm text-muted">{p.description}</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {p.bullets.map((b) => <li key={b} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{b}</li>)}
            </ul>
            <Button className="mt-6" variant={p.highlight ? "default" : "outline"} asChild><Link href={`/inscription?offre=${id}`}>Essayer 14 jours gratuitement</Link></Button>
          </div>
        );
      })}
    </div>
  );
}

export function PricingComparison() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="p-4 font-medium text-muted">Fonctionnalité</th>
            {PLAN_ORDER.map((id) => <th key={id} className="p-4 text-center font-semibold">{PLANS[id].name}</th>)}
          </tr>
        </thead>
        <tbody>
          {PLAN_COMPARISON.map((row) => (
            <tr key={row.label} className="border-b border-border last:border-0">
              <td className="p-4">{row.label}</td>
              {PLAN_ORDER.map((id) => {
                const v = row.values[id];
                return <td key={id} className="p-4 text-center">{v === true ? <Check className="mx-auto size-4 text-success" aria-label="Inclus" /> : v === false ? <Minus className="mx-auto size-4 text-muted" aria-label="Non inclus" /> : v}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
