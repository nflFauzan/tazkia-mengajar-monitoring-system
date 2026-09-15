import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db/prisma";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
} from "./token";

import type { SessionUser } from "./token";

export { SESSION_COOKIE, createSessionToken, verifySessionToken } from "./token";
export type { SessionUser } from "./token";

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * The current user, or null when signed out. Never redirects.
 *
 * The token is verified cryptographically *and* the account is confirmed to
 * still exist and be active. A signed token alone is not enough: it outlives
 * the row it names, so a deleted or deactivated account would otherwise keep
 * working until the cookie expired — and any write stamping `createdById`
 * would fail on a foreign key instead of being cleanly rejected.
 *
 * The cost is one primary-key lookup per request, which is negligible next to
 * the queries the page itself runs.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, username: true, name: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return null;

  // Prefer the stored values over the token's copy, so a renamed account shows
  // its current name without needing to sign out and back in.
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
}

/**
 * The authorization boundary for the application.
 *
 * `src/proxy.ts` also checks the cookie, but that is only a fast redirect for
 * page navigations — Server Actions and route handlers can be invoked directly,
 * so every one of them must call this. The proxy is convenience; this is
 * security.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
