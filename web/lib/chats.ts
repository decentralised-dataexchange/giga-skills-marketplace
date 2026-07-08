// Shared bits for the chat routes.
export const MAX_HTML = 512 * 1024;
const MAX_MESSAGES = 200;

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatBody {
  title?: string;
  model?: string;
  skills?: string[];
  messages?: ChatMessage[];
  appHtml?: string | null;
}

export function cleanMessages(messages?: ChatMessage[]): ChatMessage[] | null {
  if (!Array.isArray(messages)) return null;
  return messages
    .filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content }))
    .slice(-MAX_MESSAGES);
}
