import { NextResponse, type NextRequest } from "next/server";
import { verifyPayload } from "@/lib/security/signing";

/**
 * Protection des routes (première barrière). Chaque page et action revérifie
 * ensuite la session, le rôle et le périmètre côté serveur.
 */
const PROTECTED = ["/app", "/admin", "/onboarding", "/choix-commerce", "/verification-email"];

function secret() {
  const s = process.env.SESSION_SECRET ?? "";
  if (s.length >= 16) return s;
  return process.env.DEMO_MODE === "true" ? "fidely-demo-only-insecure-secret-do-not-use-in-prod" : "";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  const s = secret();
  const session = s ? await verifyPayload<{ uid: string }>(req.cookies.get("fidely_session")?.value, s) : null;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/admin/:path*", "/onboarding", "/choix-commerce", "/verification-email"] };
