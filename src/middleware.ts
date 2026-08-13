import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Optimistic gate only: no session cookie on a protected portal path means an
 * immediate redirect to that portal's login screen. Role enforcement happens
 * server-side in every portal layout and server action (src/lib/guards.ts);
 * this simply saves an unauthenticated visitor a page load.
 */

const PORTAL_LOGINS: Array<{ prefix: string; login: string; public: string[] }> = [
  { prefix: '/education', login: '/education/login', public: ['/education', '/education/login'] },
  { prefix: '/school', login: '/school/login', public: ['/school/login'] },
  { prefix: '/moe', login: '/moe/login', public: ['/moe/login'] },
  { prefix: '/dpa', login: '/dpa/login', public: ['/dpa/login'] },
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
    return NextResponse.redirect(new URL(portal.login, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/education/:path*',
    '/school/:path*',
    '/moe/:path*',
    '/dpa/:path*',
  ],
};
