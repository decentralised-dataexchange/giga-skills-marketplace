import { sql, logEvent, json } from "@/lib/db";
import { route } from "@/lib/handler";
import type { User } from "@/lib/auth";

function settingsView(settings: User["settings"]) {
  const key = settings.openrouterKey;
  const masked = key ? (key.length <= 8 ? "••••" : `${key.slice(0, 6)}…${key.slice(-4)}`) : null;
  return { hasKey: !!key, keyMasked: masked, model: settings.model ?? null };
}

export const GET = route(async ({ user }) => ({ settings: settingsView(user!.settings) }), {
  auth: true,
});

export const PUT = route(
  async ({ user, body }) => {
    const { openrouterKey, model, clearKey } = await body<{
      openrouterKey?: string;
      model?: string;
      clearKey?: boolean;
    }>();
    const settings = { ...user!.settings };
    if (clearKey) delete settings.openrouterKey;
    else if (openrouterKey?.trim()) settings.openrouterKey = openrouterKey.trim();
    if (model?.trim()) settings.model = model.trim();
    await sql`UPDATE users SET settings = ${json(settings)} WHERE id = ${user!.id}`;
    await logEvent(
      "user.settings_updated",
      user!.id,
      { userId: user!.id },
      { keyChanged: !!(clearKey || openrouterKey), model: settings.model ?? null },
    );
    return { settings: settingsView(settings) };
  },
  { auth: true },
);
