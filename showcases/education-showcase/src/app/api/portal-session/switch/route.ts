import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import { BASE_PATH } from '@/lib/base-path';
import { PORTALS, type PortalId } from '@/lib/portals';
import {
  cookieAttributes,
  isStashedRole,
  sessionCookieName,
  stashCookieName,
} from '@/lib/portal-sessions';

export const dynamic = 'force-dynamic';

/**
 * Re-activate a portal's own session from its stash cookie.
 *
 * The portal guards redirect here when the active session is missing or
 * belongs to another portal. When the stash holds a still-valid session for
 * the portal's role, it becomes the active session cookie again and the
 * visitor lands where they were going; otherwise the stale stash is dropped
 * and the portal's own login screen takes over. Either way there is no
 * redirect loop: this route never sends the visitor back to a guarded page
 * without a valid session.
 */
export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get('portal') ?? '';
  const portal = PORTALS[portalId as PortalId];
  if (!portal || !isStashedRole(portal.role)) {
    return redirectTo(request, '/');
  }

  const login = () => redirectTo(request, portal.loginPath);

  // The destination must stay inside this portal; anything else falls back
  // to the portal home.
  const next = request.nextUrl.searchParams.get('next') ?? '';
  const destination =
    next.startsWith(`/${portal.id}`) && !next.startsWith('//')
      ? next
      : portal.homePath;

  const stash = request.cookies.get(stashCookieName(portal.role))?.value;
  if (!stash) return login();
  const value = stash.includes('%') ? decodeURIComponent(stash) : stash;

  // Validate the stashed session before activating it: it may have been
  // revoked by a sign-out, a demo reset or an account deletion.
  const name = sessionCookieName((n) => request.cookies.has(n));
  const session = await auth.api
    .getSession({
      headers: new Headers({ cookie: `${name}=${encodeURIComponent(value)}` }),
    })
    .catch(() => null);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || role !== portal.role) {
    const gone = login();
    gone.cookies.set(stashCookieName(portal.role), '', {
      ...cookieAttributes(true),
      maxAge: 0,
    });
    return gone;
  }

  const response = redirectTo(request, destination);
  response.cookies.set(name, value, cookieAttributes(name.startsWith('__Secure')));
  return response;
}

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(`${BASE_PATH}${path}`, request.url));
}
