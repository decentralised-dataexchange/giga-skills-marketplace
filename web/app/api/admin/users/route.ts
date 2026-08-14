import { sql, logEvent } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { check, route } from "@/lib/handler";
import { publicUser } from "@/lib/views";
import { ASSIGNABLE_ROLES } from "@/lib/roles";

export const GET = route(
  async ({ req }) => {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 12));
    // The table is server-paginated, so the status filter must shape the page
    // query and the count together or the page numbers lie.
    const status = url.searchParams.get("status") ?? "";
    check(
      !status || ["active", "suspended"].includes(status),
      400,
      "status must be active or suspended",
    );
    const cond = status ? sql`WHERE status = ${status}` : sql``;
    const rows = await sql`
      SELECT * FROM users ${cond} ORDER BY created_at
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
    const [{ n: total }] = await sql`SELECT count(*)::int AS n FROM users ${cond}`;
    return { users: rows.map(publicUser), total, page, pageSize };
  },
  { roles: ["superadmin"] },
);

// Superadmin creates an account directly, with any role. This is the only
// place a governance role (reviewer, superadmin) can be given to a new user.
export const POST = route(
  async ({ user, body }) => {
    const { email, password, name, role } = await body<Record<string, string>>();
    check(email && password && name?.trim(), 400, "email, password and name are required");
    check(/.+@.+\..+/.test(email), 400, "email: value is not a valid email address");
    check(password.length >= 6, 400, "Password must be at least 6 characters");
    check(
      (ASSIGNABLE_ROLES as string[]).includes(role),
      400,
      `role must be one of: ${ASSIGNABLE_ROLES.join(", ")}`,
    );

    const cleanEmail = email.toLowerCase().trim();
    const [dupe] = await sql`SELECT 1 FROM users WHERE email = ${cleanEmail}`;
    check(!dupe, 409, "An account with that email already exists");

    const passwordHash = await hashPassword(password);
    const [created] = await sql`
      INSERT INTO users (email, name, role, password_hash)
      VALUES (${cleanEmail}, ${name.trim()}, ${role}, ${passwordHash}) RETURNING *`;
    await logEvent("user.created", user!.id, { userId: created.id }, { email: cleanEmail, role });
    return { user: publicUser(created) };
  },
  { roles: ["superadmin"] },
);
