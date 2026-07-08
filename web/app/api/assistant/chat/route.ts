import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { buildInstructions, DEFAULT_MODEL, renderSkillContext } from "@/lib/assistant";
import { check, route } from "@/lib/handler";

export const maxDuration = 300;

export const POST = route(async ({ user, body }) => {
  const { messages, skills, model } = await body<{ messages: UIMessage[]; skills?: string[]; model?: string }>();
  const apiKey = user!.settings.openrouterKey ?? process.env.OPENROUTER_API_KEY;
  check(apiKey, 400,
    "No OpenRouter API key on your account. Add one in Account settings (or the server operator can set OPENROUTER_API_KEY).");
  check(Array.isArray(messages) && messages.length > 0, 400, "messages[] is required");

  const slugs = (skills ?? []).map(String);
  const openrouter = createOpenRouter({ apiKey });
  const result = streamText({
    model: openrouter.chat(model ?? user!.settings.model ?? DEFAULT_MODEL),
    system: buildInstructions(await renderSkillContext(slugs), slugs),
    messages: await convertToModelMessages(messages.slice(-21)),
  });
  return result.toUIMessageStreamResponse();
}, { auth: true });
