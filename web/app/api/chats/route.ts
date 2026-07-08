import { randomBytes } from "node:crypto";
import { sql, json } from "@/lib/db";
import { route } from "@/lib/handler";
import { chatView } from "@/lib/views";
import { cleanMessages, MAX_HTML, type ChatBody } from "@/lib/chats";

export const GET = route(async ({ user }) => {
  const rows = await sql`
    SELECT * FROM chats WHERE user_id = ${user!.id} ORDER BY updated_at DESC LIMIT 100`;
  return { chats: rows.map((r) => chatView(r)) };
}, { auth: true });

export const POST = route(async ({ user, body }) => {
  const b = await body<ChatBody>();
  const [chat] = await sql`
    INSERT INTO chats (user_id, share_id, title, model, skills, messages, app_html)
    VALUES (${user!.id}, ${randomBytes(9).toString("base64url")}, ${(b.title ?? "Untitled app").slice(0, 120)},
            ${b.model ?? null}, ${json(b.skills ?? [])}, ${json(cleanMessages(b.messages) ?? [])},
            ${typeof b.appHtml === "string" ? b.appHtml.slice(0, MAX_HTML) : null})
    RETURNING *`;
  return { chat: chatView(chat, true) };
}, { auth: true });
