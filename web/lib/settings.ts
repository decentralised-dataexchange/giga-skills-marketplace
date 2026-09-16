// Operator settings a super admin changes from the dashboard
// (/governance/settings), persisted in the settings table. Each one has a
// starting value from the environment; once stored, the stored value wins,
// so the dashboard and not a redeploy is the way to change it afterwards.
import { json, logEvent, sql } from "./db";
import { marketplaceMode } from "./mode";

export interface MarketplaceSettings {
  /**
   * Demo mode: the demo accounts exist and may sign in, and the sign-in page
   * offers them under "Use a demo account". Off, they are suspended and the
   * page shows a plain sign-in. Starts from MARKETPLACE_MODE.
   */
  demoMode: boolean;
  /**
   * Visitors may create a provider account themselves on the sign-in page.
   * Off, the "Create account" option disappears and the register endpoint
   * refuses; a super admin adds accounts under Users & roles. Starts on.
   */
  selfServiceRegistration: boolean;
}

export const SETTING_KEYS: Record<keyof MarketplaceSettings, string> = {
  demoMode: "demo_mode",
  selfServiceRegistration: "self_service_registration",
};

export async function getSettings(): Promise<MarketplaceSettings> {
  const rows = await sql`
    SELECT key, value FROM settings
    WHERE key IN (${SETTING_KEYS.demoMode}, ${SETTING_KEYS.selfServiceRegistration})`;
  const stored = new Map<string, unknown>(rows.map((r) => [r.key as string, r.value]));
  const demoMode = stored.get(SETTING_KEYS.demoMode);
  const registration = stored.get(SETTING_KEYS.selfServiceRegistration);
  return {
    demoMode: typeof demoMode === "boolean" ? demoMode : marketplaceMode() === "demo",
    selfServiceRegistration: typeof registration === "boolean" ? registration : true,
  };
}

export const isDemoMode = async (): Promise<boolean> => (await getSettings()).demoMode;

export async function saveSetting(
  setting: keyof MarketplaceSettings,
  value: boolean,
  actorId: string,
): Promise<void> {
  const key = SETTING_KEYS[setting];
  await sql`
    INSERT INTO settings (key, value, updated_by) VALUES (${key}, ${json(value)}, ${actorId})
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by`;
  await logEvent("settings.updated", actorId, null, { setting: key, value });
}
