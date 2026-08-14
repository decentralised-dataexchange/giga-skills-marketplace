import { sql } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";
import { createSubmission } from "@/lib/submit";
import { findOrCreateSource } from "@/lib/sources";
import { sourceView, submissionView, type BundleFile } from "@/lib/views";

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
    const payload = await body<{
      orgId: string;
      files?: BundleFile[];
      skills?: { files: BundleFile[]; version?: string }[];
      /** Names the source record instead of the org's pseudo-source, so the
       * e2e suite can exercise source-level review and delisting without a
       * live GitHub fetch. Like the whole endpoint: never in production. */
      sourceUrl?: string;
    }>();
    const { orgId } = payload;
    const sourceUrl = payload.sourceUrl?.trim() || null;
    const sourceMeta = sourceUrl
      ? (() => {
          const m = /github\.com\/([^/]+)\/([^/?#]+)/i.exec(sourceUrl);
          check(m, 400, "sourceUrl must be a github.com/<owner>/<repo> URL");
          return { url: sourceUrl, owner: m[1], repo: m[2].replace(/\.git$/, "") };
        })()
      : null;
    // One call is one submission, whether it carries one bundle (legacy
    // shape) or several skills.
    const bundles = payload.skills?.length
      ? payload.skills
      : payload.files
        ? [{ files: payload.files, version: undefined }]
        : [];
    check(bundles.length > 0, 400, "files[] is required: [{ path, content }]");

    check(isUuid(orgId), 404, "Organisation not found");
    const [org] = await sql`SELECT * FROM orgs WHERE id = ${orgId} AND owner_id = ${user!.id}`;
    check(org, 404, "Organisation not found");
    check(org.status === "approved", 403, "This organisation is not allowed to publish skills");

    const { source, submission, created } = await sql.begin(async (tx) => {
      const db = tx as unknown as typeof sql;
      const src = await findOrCreateSource(db, org.id, sourceMeta);
      // A resubmission of a named source replaces its still-waiting
      // submission, exactly like the from-repo flow. The pseudo-source is a
      // grab-bag of unrelated direct bundles, so there it stays additive.
      if (sourceMeta) {
        await tx`
          UPDATE versions SET status = 'superseded'
          WHERE submission_id IN
            (SELECT id FROM submissions WHERE source_id = ${src.id} AND status = 'submitted')`;
        await tx`
          UPDATE submissions SET status = 'superseded'
          WHERE source_id = ${src.id} AND status = 'submitted'`;
      }
      const [sub] = await tx`
        INSERT INTO submissions (source_id, submitted_by)
        VALUES (${src.id}, ${user!.id}) RETURNING *`;
      const items = [];
      for (const bundle of bundles) {
        items.push(
          await createSubmission(
            {
              userId: user!.id,
              org: { id: org.id },
              sourceId: src.id,
              submissionId: sub.id,
              files: bundle.files,
              version: bundle.version,
            },
            db,
          ),
        );
      }
      return { source: src, submission: sub, created: items };
    });

    return {
      // Legacy single-bundle shape, kept for existing callers.
      skill: created[0].skill,
      version: created[0].version,
      source: sourceView(source),
      submission: submissionView(submission),
      skills: created.map((c) => ({ skill: c.skill, version: c.version })),
    };
  },
  { roles: ["provider"] },
);
