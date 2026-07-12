import { sql, logEvent } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { skillView } from "@/lib/views";

// Endorse or un-endorse a skill. "Official" is an operator-level trust decision,
// so it is reserved for super admins.
export const POST = route<{ id: string }>(async ({ user, params, body }) => {
  const { official } = await body<{ official?: boolean }>();
  const [skill] = await sql`SELECT * FROM skills WHERE id = ${params.id}`;
  check(skill, 404, "Skill not found");
  const [updated] = await sql`UPDATE skills SET official = ${!!official} WHERE id = ${skill.id} RETURNING *`;
  await logEvent("skill.official_set", user!.id, { skillId: skill.id }, { slug: skill.slug, official: !!official });
  return { skill: skillView(updated) };
}, { roles: ["superadmin"] });
