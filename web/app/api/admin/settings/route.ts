import { check, route } from "@/lib/handler";
import { isDemoAccount } from "@/lib/demo-accounts";
import { setDemoAccountsEnabled } from "@/lib/seed";
import { getSettings, saveSetting, type MarketplaceSettings } from "@/lib/settings";
import type { User } from "@/lib/auth";

// The settings plus whether the caller is signed in with a demo account, so
// the dashboard can warn that its password is public once demo mode is off.
async function view(user: User) {
  return { settings: await getSettings(), demoAccountSignedIn: isDemoAccount(user.email) };
}

// The marketplace settings a super admin changes from the dashboard.
export const GET = route(async ({ user }) => view(user!), { roles: ["superadmin"] });

// Change one or both settings. Turning demo mode off suspends the demo
// accounts except the one flipping the switch, so a demo super admin can do
// it without locking themselves out; they are then told to change the
// password of that account.
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

    const before = await getSettings();
    for (const key of changes) {
      const value = patch[key] as boolean;
      if (value === before[key]) continue;
      await saveSetting(key, value, user!.id);
      if (key === "demoMode") await setDemoAccountsEnabled(value, user!.id);
    }
    return view(user!);
  },
  { roles: ["superadmin"] },
);
