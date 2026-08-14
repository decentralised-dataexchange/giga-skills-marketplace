import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { BASE_PATH } from '@/lib/base-path';
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
 * Require the portal's role; redirect to its login screen otherwise.
 * Server-side redirect() does not add the deploy base path, so it is
 * prefixed explicitly here.
 */
export async function requirePortalRole(portalId: PortalId) {
  const portal = PORTALS[portalId];
  const session = await getSession();
  if (!session || (session.user as { role?: string }).role !== portal.role) {
    redirect(`${BASE_PATH}${portal.loginPath}`);
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
