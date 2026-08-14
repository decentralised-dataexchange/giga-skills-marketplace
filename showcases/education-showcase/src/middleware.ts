import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Optimistic gate only: no session cookie on a protected portal path means an
 * immediate redirect to that portal's login screen. Role enforcement happens
 * server-side in every portal layout and server action (src/lib/guards.ts);
 * this simply saves an unauthenticated visitor a page load.
 */

const PORTAL_LOGINS: Array<{
  id: string;
  prefix: string;
  login: string;
  /** Stash cookie of this portal's role (see src/lib/portal-sessions.ts). */
  stashCookie: string;
  public: string[];
}> = [
  {
    id: 'education',
    prefix: '/education',
    login: '/education/login',
    stashCookie: 'portal-session.learner',
    public: ['/education', '/education/login'],
  },
  {
    id: 'school',
    prefix: '/school',
    login: '/school/login',
    stashCookie: 'portal-session.school_officer',
    public: ['/school/login'],
  },
  // /civicworks is fully public: the candidate is an anonymous visitor.
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const portal = PORTAL_LOGINS.find(
    (p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`)
  );
  if (!portal) return NextResponse.next();
  if (portal.public.includes(pathname)) return NextResponse.next();

  const cookie = getSessionCookie(request);
  if (!cookie) {
    // Clone nextUrl rather than building a URL from scratch: it carries the
    // deploy base path, so the redirect stays under /showcase in the
    // monolith deployment.
    const target = request.nextUrl.clone();
    if (request.cookies.has(portal.stashCookie)) {
      // A stashed session for this portal exists: let the switch route try
      // to re-activate it (it falls back to the login itself).
      target.pathname = '/api/portal-session/switch';
      target.search = `?portal=${portal.id}&next=${encodeURIComponent(pathname)}`;
    } else {
      target.pathname = portal.login;
      target.search = '';
    }
    return NextResponse.redirect(target);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/education/:path*',
    '/school/:path*',
  ],
};
