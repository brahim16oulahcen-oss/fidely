"use client";
import * as React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const axis = { stroke: "var(--muted)", fontSize: 12, tickLine: false, axisLine: false } as const;

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name} <span className="ml-auto pl-3 font-medium text-foreground tabular">{p.value.toLocaleString("fr-FR")}{unit ?? ""}</span>
        </p>
      ))}
    </div>
  );
}

function useMounted() {
  const [m, setM] = React.useState(false);
  React.useEffect(() => setM(true), []);
  return m;
}

function Frame({ height, children, label }: { height: number; children: React.ReactElement; label: string }) {
  const mounted = useMounted();
  return (
    <div style={{ height }} role="img" aria-label={label} className="w-full">
      {mounted ? <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer> : <div className="size-full animate-pulse rounded-lg bg-surface-2" />}
    </div>
  );
}

export function TrendChart({ data, series, height = 260, label, unit }: { data: Record<string, string | number>[]; series: { key: string; name: string }[]; height?: number; label: string; unit?: string }) {
  return (
    <Frame height={height} label={label}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS[i]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={COLORS[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="date" {...axis} minTickGap={24} />
        <YAxis {...axis} allowDecimals={false} width={44} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: "var(--border)" }} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={COLORS[i]} strokeWidth={2} fill={`url(#g-${s.key})`} isAnimationActive={false} />
        ))}
      </AreaChart>
    </Frame>
  );
}

export function BarsChart({ data, xKey, series, height = 260, label, layout = "horizontal", unit }: { data: Record<string, string | number>[]; xKey: string; series: { key: string; name: string }[]; height?: number; label: string; layout?: "horizontal" | "vertical"; unit?: string }) {
  const vertical = layout === "vertical";
  return (
    <Frame height={height} label={label}>
      <BarChart data={data} layout={vertical ? "vertical" : "horizontal"} margin={{ top: 8, right: 12, left: vertical ? 8 : -16, bottom: 0 }}>
        <CartesianGrid vertical={vertical} horizontal={!vertical} stroke="var(--border)" />
        {vertical ? (
          <>
            <XAxis type="number" {...axis} allowDecimals={false} />
            <YAxis type="category" dataKey={xKey} {...axis} width={130} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...axis} minTickGap={12} />
            <YAxis {...axis} allowDecimals={false} width={44} />
          </>
        )}
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "var(--surface-2)" }} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={COLORS[i]} radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        ))}
      </BarChart>
    </Frame>
  );
}

export function LinesChart({ data, series, height = 260, label, unit }: { data: Record<string, string | number>[]; series: { key: string; name: string }[]; height?: number; label: string; unit?: string }) {
  return (
    <Frame height={height} label={label}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="date" {...axis} minTickGap={24} />
        <YAxis {...axis} width={44} />
        <Tooltip content={<ChartTooltip unit={unit} />} />
        {series.map((s, i) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={COLORS[i]} strokeWidth={2} dot={false} isAnimationActive={false} />
        ))}
      </LineChart>
    </Frame>
  );
}

export function DonutChart({ data, height = 220, label, colors }: { data: { name: string; value: number }[]; height?: number; label: string; colors?: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const palette = colors ?? COLORS;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative w-full max-w-[200px]">
        <Frame height={height} label={label}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none" isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </Frame>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular">{total.toLocaleString("fr-FR")}</span>
          <span className="text-xs text-muted">total</span>
        </div>
      </div>
      <ul className="w-full flex-1 space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: palette[i % palette.length] }} />
            <span className="text-muted">{d.name}</span>
            <span className="ml-auto font-medium tabular">{d.value.toLocaleString("fr-FR")}</span>
            <span className="w-12 text-right text-xs text-muted tabular">{total ? Math.round((d.value / total) * 100) : 0} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
