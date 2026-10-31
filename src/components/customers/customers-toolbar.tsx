"use client";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Download } from "lucide-react";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const SEGMENTS = [
  { id: "all", label: "Tous" },
  { id: "new", label: "Nouveaux" },
  { id: "active", label: "Actifs" },
  { id: "loyal", label: "Fidèles" },
  { id: "vip", label: "VIP" },
  { id: "inactive", label: "Inactifs" },
];

export function CustomersToolbar({ counts, canExport }: { counts: Record<string, number>; canExport: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [, start] = React.useTransition();

  const set = React.useCallback(
    (patch: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) (v === null || v === "" ? sp.delete(k) : sp.set(k, v));
      if (!("page" in patch)) sp.delete("page");
      start(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }));
    },
    [params, pathname, router],
  );

  React.useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) set({ q });
    }, 250);
    return () => clearTimeout(t);
  }, [q, params, set]);

  const segment = params.get("segment") ?? "all";
  const exportHref = `/api/export/clients?${params.toString()}`;
  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Segments">
        {SEGMENTS.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={segment === s.id}
            onClick={() => set({ segment: s.id === "all" ? null : s.id })}
            className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", segment === s.id ? "bg-[#111827] text-white dark:bg-white dark:text-[#111827]" : "text-muted hover:bg-surface-2 hover:text-foreground")}
          >
            {s.label}
            <span className={cn("rounded-full px-1.5 text-xs tabular", segment === s.id ? "bg-white/20" : "bg-surface-2")}>{counts[s.id] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par nom, email ou téléphone" className="pl-9" aria-label="Rechercher un client" />
        </div>
        <NativeSelect value={params.get("consent") ?? "any"} onChange={(e) => set({ consent: e.target.value === "any" ? null : e.target.value })} className="sm:w-56" aria-label="Filtrer par consentement">
          <option value="any">Tous les consentements</option>
          <option value="email">Accepte les emails</option>
          <option value="sms">Accepte les SMS</option>
          <option value="none">Aucun consentement marketing</option>
        </NativeSelect>
        {canExport && (
          <Button variant="outline" asChild>
            <a href={exportHref} download><Download /> Export CSV</a>
          </Button>
        )}
      </div>
    </div>
  );
}

export function SortHeader({ label, field, className }: { label: string; field: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = (params.get("sort") ?? "lastVisitAt") === field;
  const dir = params.get("dir") ?? "desc";
  return (
    <button
      className={cn("inline-flex items-center gap-1 uppercase hover:text-foreground", active && "text-foreground", className)}
      onClick={() => {
        const sp = new URLSearchParams(params.toString());
        sp.set("sort", field);
        sp.set("dir", active && dir === "desc" ? "asc" : "desc");
        router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
      }}
      aria-label={`Trier par ${label}`}
    >
      {label} {active ? (dir === "desc" ? "↓" : "↑") : ""}
    </button>
  );
}
