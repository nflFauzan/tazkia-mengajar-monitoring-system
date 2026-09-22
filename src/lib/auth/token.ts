import { SignJWT, jwtVerify } from "jose";

/**
 * Session token primitives, deliberately free of any `next/headers` or
 * `next/navigation` import.
 *
 * `src/proxy.ts` runs on the Edge runtime and cannot use those APIs, so the
 * pure sign/verify logic lives here and the cookie helpers live in session.ts.
 */

export const SESSION_COOKIE = "tazkia_session";

/** Seven days, matching the cookie lifetime. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: "ADMIN" | "PENGAJAR" | "PEMBIMBING";
  mustChangePassword: boolean;
  teamMemberId?: string | null;
}

/**
 * Resolved lazily rather than at module load, so importing this file in a
 * context without the secret (a build step, a unit test) does not throw. A
 * missing secret is still fatal the moment a session is issued or verified.
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short. It must be at least 32 characters.",
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    username: user.username,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    teamMemberId: user.teamMemberId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

/**
 * Verifies a session token, returning null for anything invalid — bad
 * signature, expired, or a payload missing required fields — rather than
 * throwing, because every caller treats "invalid" and "absent" identically.
 *
 * The algorithm is pinned so a token cannot claim `alg: none`.
 */
export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.name !== "string" ||
      (payload.role !== "ADMIN" &&
        payload.role !== "PENGAJAR" &&
        payload.role !== "PEMBIMBING")
    ) {
      return null;
    }

    return {
      id: payload.sub,
      username: payload.username,
      name: payload.name,
      role: payload.role as "ADMIN" | "PENGAJAR" | "PEMBIMBING",
      mustChangePassword: Boolean(payload.mustChangePassword),
      teamMemberId:
        typeof payload.teamMemberId === "string" ? payload.teamMemberId : null,
    };
  } catch {
    return null;
  }
}
