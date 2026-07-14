import { sql, logEvent, json } from "@/lib/db";
import { route } from "@/lib/handler";
import type { User } from "@/lib/auth";

const mask = (key?: string) =>
  key ? (key.length <= 8 ? "••••" : `${key.slice(0, 6)}…${key.slice(-4)}`) : null;

function settingsView(settings: User["settings"]) {
  return {
    hasKey: !!settings.openrouterKey,
    keyMasked: mask(settings.openrouterKey),
    hasVercelKey: !!settings.vercelKey,
    vercelKeyMasked: mask(settings.vercelKey),
    model: settings.model ?? null,
  };
}

export const GET = route(async ({ user }) => ({ settings: settingsView(user!.settings) }), {
  auth: true,
});

export const PUT = route(
  async ({ user, body }) => {
    const { openrouterKey, vercelKey, model, clearKey, clearVercelKey } = await body<{
      openrouterKey?: string;
      vercelKey?: string;
      model?: string;
      clearKey?: boolean;
      clearVercelKey?: boolean;
    }>();
    const settings = { ...user!.settings };
    if (clearKey) delete settings.openrouterKey;
    else if (openrouterKey?.trim()) settings.openrouterKey = openrouterKey.trim();
    if (clearVercelKey) delete settings.vercelKey;
    else if (vercelKey?.trim()) settings.vercelKey = vercelKey.trim();
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
