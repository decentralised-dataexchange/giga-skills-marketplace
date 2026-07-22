import { sql, logEvent } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { orgView } from "@/lib/views";
import { isUuid, slugify, RESERVED_SLUGS } from "@/lib/utils";

// Superadmin edit of an organisation: rename, change its slug, or set status
// (e.g. reject an already-approved provider to remove it from the directory).
export const PATCH = route<{ id: string }>(
  async ({ user, params, body }) => {
    const b = await body<{ name?: string; slug?: string; status?: string }>();
    check(isUuid(params.id), 404, "Organisation not found");
    const [current] = await sql`SELECT * FROM orgs WHERE id = ${params.id}`;
    check(current, 404, "Organisation not found");

    const name = b.name?.trim() || current.name;

    let slug = current.slug;
    if (b.slug !== undefined) {
      const desired = slugify(b.slug || name);
      slug = desired;
      for (let i = 2; RESERVED_SLUGS.has(slug); i++) slug = `${desired}-${i}`;
      for (let i = 2; ; i++) {
        const [taken] = await sql`SELECT 1 FROM orgs WHERE slug = ${slug} AND id <> ${params.id}`;
        if (!taken) break;
        slug = `${desired}-${i}`;
        while (RESERVED_SLUGS.has(slug)) slug = `${desired}-${++i}`;
      }
    }

    const status =
      b.status && ["pending", "approved", "rejected"].includes(b.status)
        ? b.status
        : current.status;

    const [org] = await sql`
    UPDATE orgs SET name = ${name}, slug = ${slug}, status = ${status}
    WHERE id = ${params.id} RETURNING *`;
    await logEvent("org.updated", user!.id, { orgId: org.id }, { name, slug, status });
    return { org: orgView(org) };
  },
  { roles: ["superadmin"] },
);

// Superadmin: delete an organisation and everything it published (skills, use
// cases, and their versions).
export const DELETE = route<{ id: string }>(
  async ({ user, params }) => {
    check(isUuid(params.id), 404, "Organisation not found");
    const [org] = await sql`SELECT * FROM orgs WHERE id = ${params.id}`;
    check(org, 404, "Organisation not found");
    await sql`DELETE FROM versions WHERE skill_id IN (SELECT id FROM skills WHERE org_id = ${org.id})`;
    await sql`DELETE FROM skills WHERE org_id = ${org.id}`;
    await sql`DELETE FROM orgs WHERE id = ${org.id}`;
    await logEvent("org.deleted", user!.id, { orgId: org.id }, { name: org.name });
    return { ok: true };
  },
  { roles: ["superadmin"] },
);
