import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";

import { getDb } from "@/lib/db";
import { audit } from "@/lib/audit";

/**
 * Wallet sign-in: exchange a one-time login token for a session.
 *
 * The token is written server-side by the webhook handler after OWS confirms
 * a PID presentation with `verified === true`, and pushed to the browser over
 * SSE. The browser then POSTs it here so the session cookie is set on the
 * learner's own device, not on iGrant.io's webhook call. Tokens live for two
 * minutes and work once.
 */
export const walletSignIn = () =>
  ({
    id: "wallet-sign-in",
    endpoints: {
      walletSignIn: createAuthEndpoint(
        "/wallet/sign-in",
        {
          method: "POST",
          requireRequest: true,
        },
        async (ctx) => {
          const token = typeof ctx.body?.token === "string" ? ctx.body.token : "";
          if (!token) {
            throw new APIError("BAD_REQUEST", { message: "Missing token" });
          }

          const db = getDb();
          const now = new Date().toISOString();

          // Single-use: claim the token atomically.
          const claimed = db
            .prepare(
              `UPDATE "login_tokens" SET "usedAt" = ?
               WHERE "token" = ? AND "usedAt" IS NULL AND "expiresAt" > ?
               RETURNING "userId", "exchangeId"`,
            )
            .get(now, token, now) as { userId: string; exchangeId: string } | undefined;

          if (!claimed) {
            throw new APIError("UNAUTHORIZED", {
              message: "The sign-in link is invalid or has expired.",
            });
          }

          const user = await ctx.context.internalAdapter.findUserById(claimed.userId);
          if (!user) {
            throw new APIError("UNAUTHORIZED", {
              message: "Unknown user.",
            });
          }

          const session = await ctx.context.internalAdapter.createSession(user.id);
          await setSessionCookie(ctx, { session, user });

          audit({
            actorUserId: user.id,
            actorRole: "learner",
            action: "wallet.sign-in",
            subjectType: "presentation",
            subjectId: claimed.exchangeId,
          });

          return ctx.json({ redirect: "/education/home" });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
