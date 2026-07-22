import { sql, logEvent } from "@/lib/db";
import { hashPassword, issueToken } from "@/lib/auth";
import { DEFAULT_SELF_SERVICE_ROLE, SELF_SERVICE_ROLES } from "@/lib/roles";
import { check, route } from "@/lib/handler";
import { publicUser } from "@/lib/views";

export const POST = route(async ({ body }) => {
  const { email, password, name, role } = await body<Record<string, string>>();
  check(email && password && name?.trim(), 400, "email, password and name are required");
  check(/.+@.+\..+/.test(email), 400, "email: value is not a valid email address");
  check(password.length >= 6, 400, "Password must be at least 6 characters");

  const cleanEmail = email.toLowerCase().trim();
  const [dupe] = await sql`SELECT 1 FROM users WHERE email = ${cleanEmail}`;
  check(!dupe, 409, "An account with that email already exists");

  // Governance roles are granted by a super admin, never self-assigned, and a
  // role that has been switched off cannot be claimed here either.
  const wanted = (SELF_SERVICE_ROLES as string[]).includes(role) ? role : DEFAULT_SELF_SERVICE_ROLE;
  const passwordHash = await hashPassword(password);
  const [user] = await sql`
    INSERT INTO users (email, name, role, password_hash)
    VALUES (${cleanEmail}, ${name.trim()}, ${wanted}, ${passwordHash}) RETURNING *`;
  await logEvent("user.registered", user.id, { userId: user.id }, { role: wanted });
  return { token: await issueToken(user.id), user: publicUser(user) };
});
