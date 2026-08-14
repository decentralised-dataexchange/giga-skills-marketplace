import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { PORTALS, type PortalId } from '@/lib/portals';

/**
 * Server-side role enforcement. The middleware only checks that a session
 * cookie exists; every portal layout and every mutating server action calls
 * one of these.
 */

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Require the portal's role; otherwise hand over to the portal-session
 * switch route, which re-activates this portal's stashed session when one
 * is still valid and falls back to the portal's login screen when not.
 * Server-side redirect() applies the deploy base path itself, so the plain
 * path is correct here.
 */
export async function requirePortalRole(portalId: PortalId) {
  const portal = PORTALS[portalId];
  const session = await getSession();
  if (!session || (session.user as { role?: string }).role !== portal.role) {
    redirect(`/api/portal-session/switch?portal=${portal.id}`);
  }
  return session;
}

/**
 * Require a role inside a server action. Throws instead of redirecting, so an
 * unauthorized call fails loudly rather than following a redirect.
 */
export async function requireRole(role: string) {
  const session = await getSession();
  const actual = (session?.user as { role?: string } | undefined)?.role;
  if (!session || actual !== role) {
    throw new Error('Not authorized for this action.');
  }
  return session;
}
