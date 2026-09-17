import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { purgeAccounts } from "@/lib/admin-delete";

// Superadmin: permanently delete a user. The account and the organisation it
// owns are removed together, along with everything that organisation published.
// Suspending (the reversible action) lives at /api/admin/users/[id]/status.
export const DELETE = route<{ id: string }>(
  async ({ user, params }) => {
    check(isUuid(params.id), 404, "User not found");
    const [target] = await sql`SELECT id FROM users WHERE id = ${params.id}`;
    check(target, 404, "User not found");
    check(params.id !== user!.id, 409, "You cannot delete your own account");
    const removed = await purgeAccounts({ userIds: [params.id] }, user!.id);
    return { ok: true, removed };
  },
  { roles: ["superadmin"] },
);
