const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const eur0 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("fr-FR");
const pct = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });
const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const dateShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatEuros = (cents: number) => eur.format(cents / 100);
export const formatEurosRound = (cents: number) => eur0.format(cents / 100);
export const formatNumber = (n: number) => num.format(n);
export const formatPercent = (ratio: number) => pct.format(Number.isFinite(ratio) ? ratio : 0);
export const formatDate = (iso: string | Date) => dateFmt.format(new Date(iso));
export const formatDateShort = (iso: string | Date) => dateShort.format(new Date(iso));
export const formatDateTime = (iso: string | Date) => dateTimeFmt.format(new Date(iso));

export function formatRelative(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "Jamais";
  const diff = now.getTime() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "Hier";
  if (d < 30) return `Il y a ${d} j`;
  const m = Math.round(d / 30);
  if (m < 12) return `Il y a ${m} mois`;
  return `Il y a ${Math.round(m / 12)} an${m >= 24 ? "s" : ""}`;
}

export function initials(first: string, last?: string) {
  return `${first.charAt(0)}${(last ?? "").charAt(0)}`.toUpperCase();
}

export function plural(n: number, singular: string, pluralForm?: string) {
  return `${formatNumber(n)} ${n > 1 ? (pluralForm ?? singular + "s") : singular}`;
}
