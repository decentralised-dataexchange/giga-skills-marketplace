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
 * Staff accounts (school officer, registrar, DPA admin, employer verifier)
 * sign in with email and password; the admin plugin carries their role. The
 * learner has no password: a verified PID presentation mints a one-time login
 * token, which the wallet-sign-in plugin exchanges for a normal session. Every
 * portal then checks the same session and role.
 */
export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
  },
  // The app is reached both on localhost and through the public tunnel
  // domain; both must pass Better Auth's origin check.
  trustedOrigins: [
    process.env.PUBLIC_BASE_URL ?? '',
    process.env.BETTER_AUTH_URL ?? '',
    'http://localhost:3000',
    'http://localhost:3299',
  ].filter(Boolean),
  plugins: [admin(), walletSignIn(), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
