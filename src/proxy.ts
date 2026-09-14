import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

/**
 * Next.js 16 renamed Middleware to Proxy; the behaviour is unchanged.
 *
 * This is an optimistic gate only: it keeps signed-out visitors from loading
 * application pages and bounces signed-in ones away from the login form. It is
 * deliberately *not* the authorization boundary — `requireUser()` in
 * `lib/auth/session.ts` is, and every protected page, Server Action and route
 * handler calls it, because those can be invoked without ever passing through
 * here.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (pathname === "/login") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);

    // Preserve where they were heading so login can send them back. Only the
    // pathname is carried, never a caller-supplied absolute URL, which would
    // make this an open redirect.
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Everything except Next internals and static files. Matching on exclusions
   * keeps new pages protected by default: a route added later is covered
   * without anyone remembering to update this list.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
