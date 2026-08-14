import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';

import { getDb } from '@/lib/db';
import { walletSignIn } from '@/lib/wallet-sign-in';

const db = getDb();
export { db };

/**
 * One Better Auth instance serves all five portals.
 *
 * Staff accounts (school officer, registrar)
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
});

export type Session = typeof auth.$Infer.Session;
