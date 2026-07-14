// Model catalogue for the Integration Assistant.
// When a builder sets a Vercel API key, models resolve through the Vercel AI
// Gateway (provider/model ids). Otherwise the OpenRouter fallback is used.
export const DEFAULT_MODEL = "anthropic/claude-sonnet-4";

// Vercel AI Gateway model ids (used when settings.vercelKey is present).
export const GATEWAY_MODELS = [
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4 (Anthropic)" },
  { id: "openai/gpt-4o", label: "GPT-4o (OpenAI)" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini (OpenAI)" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Google)" },
];

// OpenRouter model ids (fallback when only an OpenRouter key is set).
export const OPENROUTER_MODELS = [
  { id: "qwen/qwen3-coder", label: "Qwen3 Coder (Alibaba)" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini (OpenAI)" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Google)" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (Anthropic)" },
];

// Default catalogue exposed to the UI (Gateway-first).
export const MODELS = GATEWAY_MODELS;
