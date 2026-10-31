import "server-only";
import { headers } from "next/headers";
import { env } from "@/config/env";

/** Origine publique de l'application (pour les QR codes imprimés). */
export async function publicOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL && !env.demoMode) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
  return host ? `${proto}://${host}` : env.appUrl;
}
