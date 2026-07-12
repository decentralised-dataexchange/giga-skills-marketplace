import { sql, logEvent, json } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { applicationView } from "@/lib/views";

const isHttp = (u: string) => /^https?:\/\/.+/i.test(u);

async function ownedApp(id: string, userId: number) {
  const [app] = await sql`SELECT * FROM applications WHERE id = ${id}`;
  check(app, 404, "Application not found");
  check(app.developer_id === userId, 403, "You can only edit your own applications");
  return app;
}

// A developer edits their own application submission.
export const PATCH = route<{ id: string }>(async ({ user, params, body }) => {
  await ownedApp(params.id, user!.id);
  const b = await body<{
    title?: string; description?: string; videoUrl?: string; repoUrl?: string;
    skills?: string[]; usecases?: string[];
  }>();
  const title = b.title?.trim();
  check(title, 400, "Title is required");
  check(!b.videoUrl || isHttp(b.videoUrl), 400, "Video URL must start with http(s)://");
  check(!b.repoUrl || isHttp(b.repoUrl), 400, "Repo URL must start with http(s)://");

  const [updated] = await sql`
    UPDATE applications SET
      title = ${title}, description = ${b.description?.trim() || null},
      video_url = ${b.videoUrl?.trim() || null}, repo_url = ${b.repoUrl?.trim() || null},
      skills = ${json(Array.isArray(b.skills) ? b.skills : [])},
      usecases = ${json(Array.isArray(b.usecases) ? b.usecases : [])}
    WHERE id = ${params.id} RETURNING *`;
  await logEvent("application.updated", user!.id, { applicationId: updated.id }, { title });
  return { application: applicationView({ ...updated, developer_name: user!.name }) };
}, { auth: true });

// A developer removes their own application submission.
export const DELETE = route<{ id: string }>(async ({ user, params }) => {
  const app = await ownedApp(params.id, user!.id);
  await sql`DELETE FROM applications WHERE id = ${app.id}`;
  await logEvent("application.deleted", user!.id, { applicationId: app.id }, { title: app.title });
  return { ok: true };
}, { auth: true });
