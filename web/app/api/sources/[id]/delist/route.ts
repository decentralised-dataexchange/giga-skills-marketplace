// Delist a whole source in one action: the source record and every published
// skill in it leave the catalog together, in one transaction. History is not
// rewritten - versions, events, and the public review trail stay. Resubmitting
// the source relists it through a fresh review.
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
      "Only the owning provider or a super admin can delist",
    );

    const delisted = await sql.begin(async (tx) => {
      const db = tx as unknown as typeof sql;
      await tx`UPDATE sources SET status = 'delisted' WHERE id = ${source.id}`;
      // published_version_id stays: it keeps the review trail readable and
      // lets an approved resubmission relist without loss.
      const skills = await tx`
      UPDATE skills SET status = 'delisted'
      WHERE source_id = ${source.id} AND status = 'published' RETURNING id, slug`;
      for (const skill of skills) {
        await logEvent(
          "skill.delisted",
          user!.id,
          { skillId: skill.id, sourceId: source.id },
          { slug: skill.slug },
          db,
        );
      }
      await logEvent(
        "source.delisted",
        user!.id,
        { sourceId: source.id },
        { url: source.url, repo: source.repo, skillCount: skills.length },
        db,
      );
      return skills.length;
    });

    return { ok: true, delisted };
  },
  { auth: true },
);
