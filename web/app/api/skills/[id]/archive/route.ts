import { sql, logEvent } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";

export const POST = route<{ id: string }>(
  async ({ user, params }) => {
    check(isUuid(params.id), 404, "Skill not found");
    const [skill] = await sql`
    SELECT s.*, o.owner_id FROM skills s JOIN orgs o ON o.id = s.org_id WHERE s.id = ${params.id}`;
    check(skill, 404, "Skill not found");
    check(
      user!.role === "superadmin" || skill.owner_id === user!.id,
      403,
      "Only the owning provider or a super admin can archive",
    );
    await sql`UPDATE skills SET status = 'archived' WHERE id = ${skill.id}`;
    await logEvent("skill.archived", user!.id, { skillId: skill.id }, { slug: skill.slug });
    return { ok: true };
  },
  { auth: true },
);
