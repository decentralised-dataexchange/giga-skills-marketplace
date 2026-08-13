import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { createSubmission } from "@/lib/submit";
import type { BundleFile } from "@/lib/views";

export const POST = route(
  async ({ user, body }) => {
    // Published skills carry marketplace-verified GitHub provenance; direct
    // file submissions stay available only outside production (local
    // development and the e2e suite).
    check(
      process.env.NODE_ENV !== "production",
      403,
      "Direct file submissions are disabled; submit a public GitHub repository instead",
    );
    const { orgId, files } = await body<{ orgId: string; files: BundleFile[] }>();

    check(isUuid(orgId), 404, "Organisation not found");
    const [org] = await sql`SELECT * FROM orgs WHERE id = ${orgId} AND owner_id = ${user!.id}`;
    check(org, 404, "Organisation not found");
    check(org.status === "approved", 403, "This organisation is not allowed to publish skills");

    const { skill, version } = await createSubmission({
      userId: user!.id,
      org: { id: org.id },
      files,
    });
    return { skill, version };
  },
  { roles: ["provider"] },
);
