import { sql, logEvent } from "@/lib/db";
import { check, route } from "@/lib/handler";

export const POST = route<{ id: string }>(async ({ user, params }) => {
  const [skill] = await sql`
    SELECT s.*, o.owner_id FROM skills s JOIN orgs o ON o.id = s.org_id WHERE s.id = ${params.id}`;
  check(skill, 404, "Skill not found");
  check(user!.role === "superadmin" || skill.owner_id === user!.id, 403,
    "Only the owning provider or a super admin can delist");
  await sql`UPDATE skills SET status = 'delisted' WHERE id = ${skill.id}`;
  await logEvent("skill.delisted", user!.id, { skillId: skill.id }, { slug: skill.slug });
  return { ok: true };
}, { auth: true });
