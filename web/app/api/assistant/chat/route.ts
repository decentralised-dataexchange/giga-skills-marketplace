import { convertToModelMessages, createGateway, streamText, type UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { buildInstructions, DEFAULT_MODEL, renderSkillContext } from "@/lib/assistant";
import { check, route } from "@/lib/handler";

export const maxDuration = 300;

export const POST = route(
  async ({ user, body }) => {
    const { messages, skills, model } = await body<{
      messages: UIMessage[];
      skills?: string[];
      model?: string;
    }>();
    check(Array.isArray(messages) && messages.length > 0, 400, "messages[] is required");

    // A builder's Vercel API key routes models through the Vercel AI Gateway;
    // OpenRouter remains a fallback for accounts that set one.
    const gatewayKey = user!.settings.vercelKey ?? process.env.AI_GATEWAY_API_KEY;
    const openrouterKey = user!.settings.openrouterKey ?? process.env.OPENROUTER_API_KEY;
    check(
      gatewayKey || openrouterKey,
      400,
      "Add your Vercel API key in Settings to use the Integration Assistant.",
    );

    const chosen = model ?? user!.settings.model ?? DEFAULT_MODEL;
    const languageModel = gatewayKey
      ? createGateway({ apiKey: gatewayKey })(chosen)
      : createOpenRouter({ apiKey: openrouterKey! }).chat(chosen);

    const slugs = (skills ?? []).map(String);
    const result = streamText({
      model: languageModel,
      system: buildInstructions(await renderSkillContext(slugs), slugs),
      messages: await convertToModelMessages(messages.slice(-21)),
    });
    return result.toUIMessageStreamResponse();
  },
  { auth: true },
);
