// The starting mode of the marketplace, from the MARKETPLACE_MODE environment
// variable (server-side only, never a NEXT_PUBLIC_ value: one image serves
// every environment). It seeds the demo-mode setting; once a super admin has
// changed demo mode from the dashboard, the stored setting wins
// (lib/settings.ts).
//
// - demo (default): the first boot seeds the demo accounts, organisations
//   and skills, and the sign-in page offers "Use a demo account".
// - production: nothing is seeded, the sign-in page shows no demo accounts
//   and sends none to the browser, and the super admin comes from
//   SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD (see lib/seed.ts).
//
// An unknown value fails closed: it is treated as production and logged once.

export type MarketplaceMode = "demo" | "production";

let warned = false;

export function marketplaceMode(): MarketplaceMode {
  const raw = (process.env.MARKETPLACE_MODE ?? "demo").trim().toLowerCase();
  if (raw === "demo" || raw === "production") return raw;
  if (!warned) {
    warned = true;
    console.error(
      `Unknown MARKETPLACE_MODE "${raw}": running as production (no demo data, demo accounts hidden).`,
    );
  }
  return "production";
}

export const isProductionMode = (): boolean => marketplaceMode() === "production";
