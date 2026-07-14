import { sql } from "@/lib/db";
import { issueToken, verifyPassword } from "@/lib/auth";
import { check, route } from "@/lib/handler";
import { publicUser } from "@/lib/views";

export const POST = route(async ({ body }) => {
  const { email, password } = await body<Record<string, string>>();
  const [user] = await sql`SELECT * FROM users WHERE email = ${String(email ?? "")
    .toLowerCase()
    .trim()}`;
  check(user, 401, "Invalid email or password");
  check(await verifyPassword(password ?? "", user.password_hash), 401, "Invalid email or password");
  check(
    user.status === "active",
    403,
    "This account is suspended - contact the marketplace operator",
  );
  return { token: await issueToken(user.id), user: publicUser(user) };
});
