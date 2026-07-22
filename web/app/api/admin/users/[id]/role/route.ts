import { sql, logEvent } from "@/lib/db";
import { ASSIGNABLE_ROLES, type Role } from "@/lib/roles";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { publicUser } from "@/lib/views";

export const POST = route<{ id: string }>(
  async ({ user, params, body }) => {
    const { role } = await body<{ role: Role }>();
    check(
      ASSIGNABLE_ROLES.includes(role),
      400,
      `role must be one of: ${ASSIGNABLE_ROLES.join(", ")}`,
    );
    check(isUuid(params.id), 404, "User not found");
    check(params.id !== user!.id, 409, "You cannot change your own role");
    const [updated] =
      await sql`UPDATE users SET role = ${role} WHERE id = ${params.id} RETURNING *`;
    check(updated, 404, "User not found");
    await logEvent("user.role_changed", user!.id, { userId: updated.id }, { role });
    return { user: publicUser(updated) };
  },
  { roles: ["superadmin"] },
);
