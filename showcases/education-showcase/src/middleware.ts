import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Two jobs, both optimistic (real role enforcement stays server-side in
 * src/lib/guards.ts and in every mutating server action):
 *
 * 1. Per-portal session persistence. Each sign-in mirrors its session
 *    cookie into a per-role stash (src/lib/portal-sessions.ts). When a
 *    portal is visited while another portal's session is active, the stash
 *    value is swapped into the session cookie right here, on the request
 *    and the response, with no redirect. This works for full page loads and
 *    for client-side router fetches alike, so switching portals never asks
 *    for a fresh sign-in while the stashed session is valid. A stale stash
 *    (revoked by sign-out, reset or account deletion) simply fails the
 *    guard downstream and lands on the portal login.
 *
 * 2. The login shortcut: no session and no stash means an immediate
 *    redirect to the portal's login screen.
 */

const SESSION_COOKIE_NAMES = ["__Secure-better-auth.session_token", "better-auth.session_token"];

const PORTAL_LOGINS: Array<{
  id: string;
  prefix: string;
  login: string;
  /** Stash cookie of this portal's role (see src/lib/portal-sessions.ts). */
  stashCookie: string;
  public: string[];
}> = [
  {
    id: "education",
    prefix: "/education",
    login: "/education/login",
    stashCookie: "portal-session.learner",
    public: ["/education", "/education/login"],
  },
  {
    id: "school",
    prefix: "/school",
    login: "/school/login",
    stashCookie: "portal-session.school_officer",
    public: ["/school/login"],
  },
  // /civicworks is fully public: the candidate is an anonymous visitor.
];

function decoded(value: string): string {
  return value.includes("%") ? decodeURIComponent(value) : value;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const portal = PORTAL_LOGINS.find(
    (p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`),
  );
  if (!portal) return NextResponse.next();
  if (portal.public.includes(pathname)) return NextResponse.next();

  const stash = request.cookies.get(portal.stashCookie)?.value;

  if (stash) {
    const name =
      SESSION_COOKIE_NAMES.find((n) => request.cookies.has(n)) ??
      (request.nextUrl.protocol === "https:" ? SESSION_COOKIE_NAMES[0] : SESSION_COOKIE_NAMES[1]);
    const active = request.cookies.get(name)?.value ?? "";
    const value = decoded(stash);
    if (decoded(active) !== value) {
      // Another portal's session is active: swap this portal's own session
      // back in, both for the page about to render and for the browser.
      request.cookies.set(name, value);
      const response = NextResponse.next({ request });
      response.cookies.set(name, value, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: name.startsWith("__Secure"),
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }
    return NextResponse.next();
  }

  const cookie = getSessionCookie(request);
  if (!cookie) {
    // Clone nextUrl rather than building a URL from scratch: it carries the
    // deploy base path, so the redirect stays under /showcase in the
    // monolith deployment.
    const login = request.nextUrl.clone();
    login.pathname = portal.login;
    login.search = "";
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/education/:path*", "/school/:path*"],
};
