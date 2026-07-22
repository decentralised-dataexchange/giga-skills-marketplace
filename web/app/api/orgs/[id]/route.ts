import { sql, logEvent } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { orgView } from "@/lib/views";

const MAX_LOGO = 512 * 1024; // ~512 KB data: URL
const LOGO_RE = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/;

// A provider updates their own organisation (name, website, description, logo).
// A super admin may update any organisation.
export const PATCH = route<{ id: string }>(
  async ({ user, params, body }) => {
    const b = await body<{
      name?: string;
      website?: string;
      description?: string;
      logo?: string | null;
    }>();
    check(isUuid(params.id), 404, "Organisation not found");
    const [org] = await sql`SELECT * FROM orgs WHERE id = ${params.id}`;
    check(org, 404, "Organisation not found");
    check(
      user!.role === "superadmin" || org.owner_id === user!.id,
      403,
      "You can only edit your own organisation",
    );

    const name = b.name?.trim() || org.name;
    const website = b.website !== undefined ? b.website?.trim() || null : org.website;
    const description = b.description?.trim() || org.description;

    let logo = org.logo;
    if (b.logo !== undefined) {
      if (!b.logo) logo = null;
      else {
        check(
          LOGO_RE.test(b.logo),
          400,
          "Logo must be a data: image URL (png, jpeg, gif, webp, svg)",
        );
        check(b.logo.length <= MAX_LOGO, 400, "Logo is too large (max ~512 KB)");
        logo = b.logo;
      }
    }

    const [updated] = await sql`
    UPDATE orgs SET name = ${name}, website = ${website}, description = ${description}, logo = ${logo}
    WHERE id = ${org.id} RETURNING *`;
    await logEvent("org.updated", user!.id, { orgId: org.id }, { name });
    return { org: orgView(updated) };
  },
  { roles: ["provider", "superadmin"] },
);
