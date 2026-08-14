import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { admin } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';

import { getDb } from '@/lib/db';
import {
  cookieAttributes,
  isStashedRole,
  sessionCookieFromSetCookie,
  stashCookieName,
} from '@/lib/portal-sessions';
import { walletSignIn } from '@/lib/wallet-sign-in';

const db = getDb();
export { db };

/**
 * One Better Auth instance serves all five portals.
 *
 * Staff accounts (school officer)
 * sign in with email and password; the admin plugin carries their role. The
 * learner has no password: a verified PID presentation mints a one-time login
 * token, which the wallet-sign-in plugin exchanges for a normal session. Every
 * portal then checks the same session and role.
 */
// better-auth always works at its default /api/auth base; under the
// monolith deploy prefix, the route handler strips the prefix from the
// request URL before handing it over. A path-carrying BETTER_AUTH_URL
// would be misread as the endpoint base, so only its origin is passed.
const authUrl =
  process.env.BETTER_AUTH_URL || process.env.PUBLIC_BASE_URL || '';
let authOrigin: string | undefined;
try {
  authOrigin = authUrl ? new URL(authUrl).origin : undefined;
} catch {
  authOrigin = undefined;
}

export const auth = betterAuth({
  database: db,
  ...(authOrigin ? { baseURL: authOrigin } : {}),
  emailAndPassword: {
    enabled: true,
  },
  // The app is reached on localhost, through the public tunnel domain, and
  // in the monolith deployment on the shared marketplace domain (where the
  // base URL carries the /showcase path, so the origin is derived).
  trustedOrigins: [
    process.env.PUBLIC_BASE_URL ?? '',
    process.env.BETTER_AUTH_URL ?? '',
    ...[process.env.PUBLIC_BASE_URL, process.env.BETTER_AUTH_URL]
      .filter((value): value is string => Boolean(value))
      .map((value) => {
        try {
          return new URL(value).origin;
        } catch {
          return '';
        }
      }),
    'http://localhost:3000',
    'http://localhost:3299',
  ].filter(Boolean),
  plugins: [admin(), walletSignIn(), nextCookies()],
  // Per-portal session persistence: mirror every new session cookie into a
  // per-role stash cookie, so the switch route can re-activate a portal's
  // session after another portal signed in. A stash left behind by a
  // sign-out points at a revoked session; the switch route detects that and
  // clears it, so no sign-out hook is needed here.
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const fresh = ctx.context.newSession;
      if (!fresh) return;
      const role = (fresh.user as { role?: string }).role ?? '';
      if (!isStashedRole(role)) return;
      const headers = ctx.context.responseHeaders;
      const cookie = headers ? sessionCookieFromSetCookie(headers) : null;
      if (!cookie) return;
      ctx.setCookie(
        stashCookieName(role),
        cookie.value,
        cookieAttributes(cookie.name.startsWith('__Secure'))
      );
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
