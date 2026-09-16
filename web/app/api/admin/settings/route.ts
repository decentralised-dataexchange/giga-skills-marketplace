import { check, route } from "@/lib/handler";
import { isDemoAccount } from "@/lib/demo-accounts";
import { setDemoAccountsEnabled } from "@/lib/seed";
import { getSettings, saveSetting, type MarketplaceSettings } from "@/lib/settings";

// The marketplace settings a super admin changes from the dashboard.
export const GET = route(async () => ({ settings: await getSettings() }), {
  roles: ["superadmin"],
});

// Change one or both settings. Turning demo mode off suspends the demo
// accounts, so a demo super admin cannot do it: they would lock themselves
// out and leave the marketplace without an operator.
export const PATCH = route(
  async ({ user, body }) => {
    const patch = await body<Partial<MarketplaceSettings>>();
    const changes = (["demoMode", "selfServiceRegistration"] as const).filter(
      (key) => patch[key] !== undefined,
    );
    check(changes.length > 0, 400, "Nothing to change");
    for (const key of changes) {
      check(typeof patch[key] === "boolean", 400, `${key} must be true or false`);
    }
    if (patch.demoMode === false) {
      check(
        !isDemoAccount(user!.email),
        409,
        "Sign in with a non-demo super admin account before turning demo mode off",
      );
    }

    const before = await getSettings();
    for (const key of changes) {
      const value = patch[key] as boolean;
      if (value === before[key]) continue;
      await saveSetting(key, value, user!.id);
      if (key === "demoMode") await setDemoAccountsEnabled(value);
    }
    return { settings: await getSettings() };
  },
  { roles: ["superadmin"] },
);
