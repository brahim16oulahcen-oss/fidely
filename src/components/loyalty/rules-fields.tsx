"use client";
import * as React from "react";
import type { ProgramRules } from "@/types/domain";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";

function num(v: string) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Champs de règles selon le type de programme (contrôlé). */
export function RulesFields({ value, onChange, errors }: { value: ProgramRules; onChange: (r: ProgramRules) => void; errors?: Record<string, string> }) {
  const err = (k: string) => errors?.[`rules.${k}`] ?? errors?.[k];
  switch (value.type) {
    case "stamps":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de passages requis" htmlFor="r-req" error={err("stampsRequired")} hint="Ex. 10 cafés = 1 offert">
            <Input id="r-req" type="number" min={2} max={30} value={value.stampsRequired} onChange={(e) => onChange({ ...value, stampsRequired: Math.round(num(e.target.value)) })} data-testid="rule-stamps-required" />
          </Field>
          <Field label="Tampons par passage" htmlFor="r-per" error={err("stampsPerVisit")}>
            <Input id="r-per" type="number" min={1} max={5} value={value.stampsPerVisit} onChange={(e) => onChange({ ...value, stampsPerVisit: Math.round(num(e.target.value)) })} />
          </Field>
          <Field label="Récompense" htmlFor="r-name" error={err("rewardName")}>
            <Input id="r-name" value={value.rewardName} onChange={(e) => onChange({ ...value, rewardName: e.target.value })} data-testid="rule-reward-name" />
          </Field>
          <Field label="Validité de la récompense (jours)" htmlFor="r-val" error={err("rewardValidityDays")}>
            <Input id="r-val" type="number" min={7} max={365} value={value.rewardValidityDays} onChange={(e) => onChange({ ...value, rewardValidityDays: Math.round(num(e.target.value)) })} />
          </Field>
        </div>
      );
    case "points":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Points par euro dépensé" htmlFor="r-ppe" error={err("pointsPerEuro")}>
            <Input id="r-ppe" type="number" min={1} max={100} value={value.pointsPerEuro} onChange={(e) => onChange({ ...value, pointsPerEuro: Math.round(num(e.target.value)) })} />
          </Field>
          <Field label="Points de bienvenue" htmlFor="r-wel" error={err("welcomePoints")}>
            <Input id="r-wel" type="number" min={0} max={1000} value={value.welcomePoints} onChange={(e) => onChange({ ...value, welcomePoints: Math.round(num(e.target.value)) })} />
          </Field>
          <p className="text-sm text-muted sm:col-span-2">Les récompenses et leur coût en points se définissent dans l&apos;étape / la page Récompenses.</p>
        </div>
      );
    case "cashback":
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Taux de cashback (%)" htmlFor="r-pct" error={err("percent")}>
            <Input id="r-pct" type="number" step="0.5" min={0.5} max={20} value={value.percent} onChange={(e) => onChange({ ...value, percent: num(e.target.value) })} />
          </Field>
          <Field label="Achat minimum (€)" htmlFor="r-min" error={err("minPurchaseCents")}>
            <Input id="r-min" type="number" min={0} value={value.minPurchaseCents / 100} onChange={(e) => onChange({ ...value, minPurchaseCents: Math.round(num(e.target.value) * 100) })} />
          </Field>
          <Field label="Crédit max. par achat (€)" htmlFor="r-max" error={err("maxCreditPerTxCents")}>
            <Input id="r-max" type="number" min={1} value={value.maxCreditPerTxCents / 100} onChange={(e) => onChange({ ...value, maxCreditPerTxCents: Math.round(num(e.target.value) * 100) })} />
          </Field>
        </div>
      );
    case "tiers":
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Points par euro" htmlFor="r-tppe" error={err("pointsPerEuro")}>
            <Input id="r-tppe" type="number" min={1} value={value.pointsPerEuro} onChange={(e) => onChange({ ...value, pointsPerEuro: Math.round(num(e.target.value)) })} />
          </Field>
          <Field label="Seuil Silver (pts cumulés)" htmlFor="r-sil" error={err("silverThreshold")}>
            <Input id="r-sil" type="number" min={10} value={value.silverThreshold} onChange={(e) => onChange({ ...value, silverThreshold: Math.round(num(e.target.value)) })} />
          </Field>
          <Field label="Seuil Gold (pts cumulés)" htmlFor="r-gold" error={err("goldThreshold")}>
            <Input id="r-gold" type="number" min={20} value={value.goldThreshold} onChange={(e) => onChange({ ...value, goldThreshold: Math.round(num(e.target.value)) })} />
          </Field>
          {(["bronze", "silver", "gold"] as const).map((t) => (
            <Field key={t} label={`Avantage ${t[0].toUpperCase() + t.slice(1)}`} htmlFor={`r-b-${t}`}>
              <Input id={`r-b-${t}`} value={value.benefits[t]} onChange={(e) => onChange({ ...value, benefits: { ...value.benefits, [t]: e.target.value } })} />
            </Field>
          ))}
          {(["bronze", "silver", "gold"] as const).map((t) => (
            <Field key={`m-${t}`} label={`Multiplicateur ${t[0].toUpperCase() + t.slice(1)}`} htmlFor={`r-m-${t}`}>
              <Input id={`r-m-${t}`} type="number" step="0.05" min={1} max={5} value={value.multipliers[t]} onChange={(e) => onChange({ ...value, multipliers: { ...value.multipliers, [t]: num(e.target.value) } })} />
            </Field>
          ))}
        </div>
      );
  }
}
