import { MODELS } from "@/lib/assistant";
import { route } from "@/lib/handler";

export const GET = route(async () => ({ models: MODELS }));
