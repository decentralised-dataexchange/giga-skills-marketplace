import 'server-only';

/**
 * Per-portal session persistence.
 *
 * One Better Auth instance means one active session cookie, so signing in at
 * a second portal used to replace the first portal's session. Better Auth
 * keeps every session row valid until expiry, so the fix is small: at
 * sign-in the signed session-cookie value is mirrored into a per-role stash
 * cookie, and the switch route swaps a stashed value back into the session
 * cookie when a portal needs its own role again. Switching portals then
 * never asks for a fresh sign-in while the stashed session is still valid.
 */

const SESSION_COOKIE_NAMES = [
  '__Secure-better-auth.session_token',
  'better-auth.session_token',
] as const;

/** Only the roles that sign in have a stash. */
export const STASHED_ROLES = ['learner', 'school_officer'] as const;
export type StashedRole = (typeof STASHED_ROLES)[number];

export function isStashedRole(role: string): role is StashedRole {
  return (STASHED_ROLES as readonly string[]).includes(role);
}

export function stashCookieName(role: StashedRole): string {
  return `portal-session.${role}`;
}

/**
 * Pull the freshly written session cookie out of response Set-Cookie
 * headers, right after Better Auth set it.
 */
export function sessionCookieFromSetCookie(
  headers: Headers
): { name: string; value: string } | null {
  for (const line of headers.getSetCookie()) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    if ((SESSION_COOKIE_NAMES as readonly string[]).includes(name)) {
      const value = decodeURIComponent(pair.slice(eq + 1).trim());
      if (value) return { name, value };
    }
  }
  return null;
}

/**
 * True when the current request carries a stashed session for the role that
 * is still valid. Login pages use this: they are public, so the middleware
 * does not swap the stash in there; a valid stash means the visitor can go
 * straight to the portal home instead of signing in again. Read-only: an
 * invalid stash is simply reported false (the next sign-in overwrites it).
 */
export async function hasRestorableSession(
  role: StashedRole
): Promise<boolean> {
  const { cookies } = await import('next/headers');
  const stash = (await cookies()).get(stashCookieName(role))?.value;
  if (!stash) return false;
  const value = stash.includes('%') ? decodeURIComponent(stash) : stash;

  const base =
    process.env.BETTER_AUTH_URL || process.env.PUBLIC_BASE_URL || '';
  const name = base.startsWith('https://')
    ? '__Secure-better-auth.session_token'
    : 'better-auth.session_token';

  const { auth } = await import('@/lib/auth');
  const session = await auth.api
    .getSession({
      headers: new Headers({ cookie: `${name}=${encodeURIComponent(value)}` }),
    })
    .catch(() => null);
  return (session?.user as { role?: string } | undefined)?.role === role;
}

/** Shared attributes for the stash and restored session cookies. */
export function cookieAttributes(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure,
    maxAge: 60 * 60 * 24 * 7,
  };
}
