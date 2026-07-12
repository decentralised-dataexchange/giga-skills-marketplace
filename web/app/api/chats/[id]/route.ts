import { sql, json } from "@/lib/db";
import { check, route } from "@/lib/handler";
import { chatView } from "@/lib/views";
import { cleanMessages, MAX_HTML, type ChatBody } from "@/lib/chats";

export const GET = route<{ id: string }>(
  async ({ user, params }) => {
    const [chat] = await sql`SELECT * FROM chats WHERE id = ${params.id} AND user_id = ${user!.id}`;
    check(chat, 404, "Chat not found");
    return { chat: chatView(chat, true) };
  },
  { auth: true },
);

export const PUT = route<{ id: string }>(
  async ({ user, params, body }) => {
    const b = await body<ChatBody>();
    const [current] =
      await sql`SELECT * FROM chats WHERE id = ${params.id} AND user_id = ${user!.id}`;
    check(current, 404, "Chat not found");
    const messages = cleanMessages(b.messages);
    const appHtml =
      "appHtml" in b
        ? typeof b.appHtml === "string"
          ? b.appHtml.slice(0, MAX_HTML)
          : null
        : current.app_html;
    const [chat] = await sql`
    UPDATE chats SET title = ${b.title?.slice(0, 120) ?? current.title},
                     model = ${"model" in b ? (b.model ?? null) : current.model},
                     skills = ${json(b.skills ?? current.skills)},
                     messages = ${json(messages ?? current.messages)},
                     app_html = ${appHtml}, updated_at = now()
    WHERE id = ${current.id} RETURNING *`;
    return { chat: chatView(chat, true) };
  },
  { auth: true },
);

export const DELETE = route<{ id: string }>(
  async ({ user, params }) => {
    const rows =
      await sql`DELETE FROM chats WHERE id = ${params.id} AND user_id = ${user!.id} RETURNING id`;
    check(rows.length > 0, 404, "Chat not found");
    return { ok: true };
  },
  { auth: true },
);
