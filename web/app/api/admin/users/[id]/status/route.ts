import { sql, logEvent } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { publicUser } from "@/lib/views";

export const POST = route<{ id: string }>(
  async ({ user, params, body }) => {
    const { status } = await body<{ status: string }>();
    check(["active", "suspended"].includes(status), 400, "status must be active or suspended");
    check(Number(params.id) !== user!.id, 409, "You cannot suspend your own account");
    const [updated] =
      await sql`UPDATE users SET status = ${status} WHERE id = ${params.id} RETURNING *`;
    check(updated, 404, "User not found");
    if (status === "suspended") await sql`DELETE FROM tokens WHERE user_id = ${updated.id}`;
    await logEvent(`user.${status}`, user!.id, { userId: updated.id }, null);
    return { user: publicUser(updated) };
  },
  { roles: ["superadmin"] },
);
