export const DAY_MS = 86_400_000;

export function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * DAY_MS);
}
export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
export function daysBetween(a: Date | string, b: Date | string) {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS);
}
export function isoDay(d: Date | string) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function inRange(iso: string, from: Date, to: Date) {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}
