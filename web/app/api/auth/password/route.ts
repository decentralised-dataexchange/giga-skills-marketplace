import { sql, logEvent } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { check, route } from "@/lib/handler";

// Change the signed-in user's password. Verifies the current password, then
// revokes every other session (keeping the caller's token) as a security default.
export const POST = route(
  async ({ req, user, body }) => {
    const { currentPassword, newPassword } = await body<{
      currentPassword?: string;
      newPassword?: string;
    }>();
    check(currentPassword && newPassword, 400, "Current and new password are required");
    check(newPassword.length >= 6, 400, "New password must be at least 6 characters");

    const [row] = await sql`SELECT password_hash FROM users WHERE id = ${user!.id}`;
    check(
      await verifyPassword(currentPassword, row.password_hash),
      401,
      "Current password is incorrect",
    );
    check(
      !(await verifyPassword(newPassword, row.password_hash)),
      400,
      "New password must differ from the current one",
    );

    const passwordHash = await hashPassword(newPassword);
    await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${user!.id}`;

    const currentToken = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
    await sql`DELETE FROM tokens WHERE user_id = ${user!.id} AND token <> ${currentToken}`;

    await logEvent("user.password_changed", user!.id, { userId: user!.id }, null);
    return { ok: true };
  },
  { auth: true },
);
