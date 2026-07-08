import { sql, logEvent } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { orgView } from "@/lib/views";

export const POST = route(async ({ user, body }) => {
  const { name, website, description, contact } = await body<Record<string, string>>();
  check(name?.trim() && description?.trim(), 400, "name and description are required");
  const [existing] = await sql`SELECT 1 FROM orgs WHERE owner_id = ${user!.id} AND status <> 'rejected'`;
  check(!existing, 409, "You already have an organisation registration");
  const [org] = await sql`
    INSERT INTO orgs (name, website, description, contact, owner_id)
    VALUES (${name.trim()}, ${website?.trim() ?? ""}, ${description.trim()}, ${contact?.trim() || user!.email}, ${user!.id})
    RETURNING *`;
  await logEvent("org.submitted", user!.id, { orgId: org.id }, { name: org.name });
  return { org: orgView(org) };
}, { roles: ["provider"] });
