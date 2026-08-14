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
 * The active session cookie: prefer the name present among the request
 * cookies; fall back to the secure variant when the app runs behind HTTPS
 * (the tunnel and production) and the plain one otherwise.
 */
export function sessionCookieName(
  has: (name: string) => boolean
): (typeof SESSION_COOKIE_NAMES)[number] {
  for (const name of SESSION_COOKIE_NAMES) {
    if (has(name)) return name;
  }
  const base = process.env.BETTER_AUTH_URL || process.env.PUBLIC_BASE_URL || '';
  return base.startsWith('https://')
    ? SESSION_COOKIE_NAMES[0]
    : SESSION_COOKIE_NAMES[1];
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
