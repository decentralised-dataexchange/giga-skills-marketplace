import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { PORTALS, type PortalId } from "@/lib/portals";

/**
 * Server-side role enforcement. The middleware only checks that a session
 * cookie exists; every portal layout and every mutating server action calls
 * one of these.
 */

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Require the portal's role; redirect to its login screen otherwise. The
 * middleware has already swapped in this portal's stashed session when one
 * exists, so reaching this mismatch means there is no usable session for
 * the portal. Server-side redirect() applies the deploy base path itself,
 * so the plain portal path is correct here.
 */
export async function requirePortalRole(portalId: PortalId) {
  const portal = PORTALS[portalId];
  const session = await getSession();
  if (!session || (session.user as { role?: string }).role !== portal.role) {
    redirect(portal.loginPath);
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
    throw new Error("Not authorized for this action.");
  }
  return session;
}
