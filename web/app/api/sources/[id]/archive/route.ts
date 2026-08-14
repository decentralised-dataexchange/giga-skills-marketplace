// Archive a whole source in one action: the source record, every published
// skill in it, and every submission of it still waiting for review leave
// together, in one transaction. History is not rewritten - versions, events,
// and the public review trail stay. Resubmitting the source relists it
// through a fresh review.
import { sql, logEvent } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { isUuid } from "@/lib/utils";

export const POST = route<{ id: string }>(
  async ({ user, params }) => {
    check(isUuid(params.id), 404, "Source not found");
    const [source] = await sql`
    SELECT src.*, o.owner_id FROM sources src JOIN orgs o ON o.id = src.org_id
    WHERE src.id = ${params.id}`;
    check(source, 404, "Source not found");
    check(
      user!.role === "superadmin" || source.owner_id === user!.id,
      403,
      "Only the owning provider or a super admin can archive",
    );

    const { archived, submissionsArchived } = await sql.begin(async (tx) => {
      const db = tx as unknown as typeof sql;
      await tx`UPDATE sources SET status = 'archived' WHERE id = ${source.id}`;
      // published_version_id stays: it keeps the review trail readable and
      // lets an approved resubmission relist without loss.
      const skills = await tx`
      UPDATE skills SET status = 'archived'
      WHERE source_id = ${source.id} AND status = 'published' RETURNING id, slug`;
      // Submissions still waiting for review are withdrawn: they leave the
      // queue, and a decision on them answers 409 from now on. reviewer_id
      // stays as history of who had the claim.
      const withdrawn = await tx`
      UPDATE submissions SET status = 'archived', decided_at = now()
      WHERE source_id = ${source.id} AND status IN ('submitted','in_review') RETURNING id`;
      if (withdrawn.length) {
        await tx`
        UPDATE versions SET status = 'archived'
        WHERE submission_id = ANY(${withdrawn.map((s) => s.id as string)})
          AND status IN ('submitted','in_review')`;
      }
      for (const skill of skills) {
        await logEvent(
          "skill.archived",
          user!.id,
          { skillId: skill.id, sourceId: source.id },
          { slug: skill.slug },
          db,
        );
      }
      await logEvent(
        "source.archived",
        user!.id,
        { sourceId: source.id },
        {
          url: source.url,
          repo: source.repo,
          skillCount: skills.length,
          submissionCount: withdrawn.length,
        },
        db,
      );
      return { archived: skills.length, submissionsArchived: withdrawn.length };
    });

    return { ok: true, archived, submissionsArchived };
  },
  { auth: true },
);
