import { sql, logEvent } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { orgView } from "@/lib/views";
import { isUuid, slugify, RESERVED_SLUGS } from "@/lib/utils";
import { purgeAccounts } from "@/lib/admin-delete";

// Superadmin edit of an organisation: rename, change its slug, or set status.
// A suspended (or rejected) organisation leaves the public catalog together
// with its published skills, and it cannot publish new skills; "approved"
// reinstates it.
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
      b.status && ["approved", "rejected", "suspended"].includes(b.status)
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

// Superadmin: delete an organisation and everything it published (sources,
// skills, submissions, and their versions), together with its owner's account.
// The reversible action is suspension, via PATCH above.
export const DELETE = route<{ id: string }>(
  async ({ user, params }) => {
    check(isUuid(params.id), 404, "Organisation not found");
    const [org] = await sql`SELECT id FROM orgs WHERE id = ${params.id}`;
    check(org, 404, "Organisation not found");
    const removed = await purgeAccounts({ orgIds: [params.id] }, user!.id);
    return { ok: true, removed };
  },
  { roles: ["superadmin"] },
);
