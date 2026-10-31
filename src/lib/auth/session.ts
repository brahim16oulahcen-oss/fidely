import "server-only";
import { cookies } from "next/headers";
import { assertSessionSecret } from "@/config/env";
import { signPayload, verifyPayload } from "@/lib/security/signing";

export const SESSION_COOKIE = "fidely_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export interface SessionPayload {
  uid: string;
  mid: string | null; // commerce actif
  exp: number;
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifyPayload<SessionPayload>(store.get(SESSION_COOKIE)?.value, assertSessionSecret());
}

export async function writeSession(uid: string, mid: string | null) {
  const store = await cookies();
  const token = await signPayload({ uid, mid, exp: Date.now() + MAX_AGE * 1000 }, assertSessionSecret());
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.PLAYWRIGHT,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
