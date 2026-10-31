/**
 * Limiteur en mémoire (fenêtre fixe). Suffisant pour un prototype mono-instance ;
 * en production, utiliser un stockage partagé (Redis / Upstash) ou les limites Supabase.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  if (process.env.FIDELY_DISABLE_RATE_LIMIT === "true") return true;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count++;
  return b.count <= max;
}
