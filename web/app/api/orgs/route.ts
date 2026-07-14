import { sql, logEvent } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { orgView } from "@/lib/views";
import { slugify, RESERVED_SLUGS } from "@/lib/utils";

export const POST = route(
  async ({ user, body }) => {
    const { name, website, description, contact, slug } = await body<Record<string, string>>();
    check(name?.trim() && description?.trim(), 400, "name and description are required");
    const [existing] =
      await sql`SELECT 1 FROM orgs WHERE owner_id = ${user!.id} AND status <> 'rejected'`;
    check(!existing, 409, "You already have an organisation registration");

    // A unique, URL-safe slug: the provider can propose one, else derive from the name.
    const desired = slugify(slug?.trim() || name);
    let orgSlug = desired;
    for (let i = 2; RESERVED_SLUGS.has(orgSlug); i++) orgSlug = `${desired}-${i}`;
    for (let i = 2; ; i++) {
      const [taken] = await sql`SELECT 1 FROM orgs WHERE slug = ${orgSlug}`;
      if (!taken) break;
      orgSlug = `${desired}-${i}`;
      while (RESERVED_SLUGS.has(orgSlug)) orgSlug = `${desired}-${++i}`;
    }

    const [org] = await sql`
    INSERT INTO orgs (name, slug, website, description, contact, owner_id)
    VALUES (${name.trim()}, ${orgSlug}, ${website?.trim() ?? ""}, ${description.trim()}, ${contact?.trim() || user!.email}, ${user!.id})
    RETURNING *`;
    await logEvent("org.submitted", user!.id, { orgId: org.id }, { name: org.name });
    return { org: orgView(org) };
  },
  { roles: ["provider"] },
);
