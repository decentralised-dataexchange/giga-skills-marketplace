import { sql, logEvent, json } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { applicationView } from "@/lib/views";

const isHttp = (u: string) => /^https?:\/\/.+/i.test(u);

// Public, paginated list of developer application showcases.
export const GET = route(async ({ req }) => {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.toLowerCase().trim() ?? "";
  const page = Math.max(1, Number(u.searchParams.get("page")) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(u.searchParams.get("pageSize")) || 9));
  const like = `%${q}%`;
  const qCond = q
    ? sql`AND (lower(a.title) LIKE ${like} OR lower(coalesce(a.description,'')) LIKE ${like})`
    : sql``;
  const rows = await sql`
    SELECT a.*, u.name AS developer_name
    FROM applications a JOIN users u ON u.id = a.developer_id
    WHERE a.status = 'published' ${qCond}
    ORDER BY a.id DESC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  const [{ n: total }] = await sql`
    SELECT count(*)::int AS n FROM applications a WHERE a.status = 'published' ${qCond}`;
  return { applications: rows.map(applicationView), total, page, pageSize };
});

// A signed-in developer submits an application showcase.
export const POST = route(
  async ({ user, body }) => {
    const b = await body<{
      title?: string;
      description?: string;
      videoUrl?: string;
      repoUrl?: string;
      skills?: string[];
      usecases?: string[];
    }>();
    const title = b.title?.trim();
    check(title, 400, "Title is required");
    check(!b.videoUrl || isHttp(b.videoUrl), 400, "Video URL must start with http(s)://");
    check(!b.repoUrl || isHttp(b.repoUrl), 400, "Repo URL must start with http(s)://");
    const skills = Array.isArray(b.skills) ? b.skills : [];
    const usecases = Array.isArray(b.usecases) ? b.usecases : [];

    const [app] = await sql`
    INSERT INTO applications (developer_id, title, description, video_url, repo_url, skills, usecases)
    VALUES (${user!.id}, ${title}, ${b.description?.trim() || null},
            ${b.videoUrl?.trim() || null}, ${b.repoUrl?.trim() || null}, ${json(skills)}, ${json(usecases)})
    RETURNING *`;
    await logEvent(
      "application.submitted",
      user!.id,
      { applicationId: app.id },
      { title: app.title },
    );
    return { application: applicationView({ ...app, developer_name: user!.name }) };
  },
  { auth: true },
);
