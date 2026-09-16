// The demo accounts of the marketplace: seeded on the first boot in demo mode
// (lib/seed.ts) and offered on the sign-in page under "Use a demo account".
// One list, so the page and the seed can never disagree. In production mode
// (lib/mode.ts) they are neither seeded nor sent to the browser; the sign-in
// page imports only the type, so the credentials never enter the client
// bundle.
import type { Role } from "./roles";

export interface DemoAccount {
  email: string;
  password: string;
  name: string;
  role: Role;
  /** What the account can do, as shown in the sign-in drawer. */
  label: string;
}

/** The fields the sign-in drawer shows; the password is part of the demo by design. */
export type DemoAccountView = Pick<DemoAccount, "email" | "password" | "label">;

export const isDemoAccount = (email: string): boolean =>
  DEMO_ACCOUNTS.some((account) => account.email === email.toLowerCase().trim());

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    email: "superadmin@govbuild.test",
    password: "super123",
    name: "Marketplace Operator",
    role: "superadmin",
    label: "Super admin (orgs, users, roles, full governance)",
  },
  {
    email: "reviewer@govbuild.test",
    password: "review123",
    name: "Skill Reviewer",
    role: "reviewer",
    label: "Skill reviewer (review queue only)",
  },
  {
    email: "provider@igrant.io",
    password: "provider123",
    name: "iGrant.io Developer Relations",
    role: "provider",
    label: "Approved provider (iGrant.io)",
  },
  {
    email: "labs@educhain.test",
    password: "provider123",
    name: "EduChain Labs",
    role: "provider",
    label: "Provider (EduChain Labs)",
  },
];
