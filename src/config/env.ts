/**
 * Configuration d'exécution. DEMO_MODE doit être explicitement à "true"
 * pour activer le sélecteur de rôle et les données fictives.
 */
export const env = {
  demoMode: process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  dataDir: process.env.DEMO_DATA_DIR ?? ".data",
  persist: process.env.FIDELY_PERSIST !== "false",
};

export function assertSessionSecret(): string {
  const s = env.sessionSecret;
  if (s.length >= 16) return s;
  if (env.demoMode) return "fidely-demo-only-insecure-secret-do-not-use-in-prod";
  throw new Error("SESSION_SECRET manquant ou trop court (16 caractères minimum).");
}
