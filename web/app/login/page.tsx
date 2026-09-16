import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { ensureReady } from "@/lib/db";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { getSettings } from "@/lib/settings";
import { LoginForm } from "./login-form";

// Rendered per request, never at build time: the settings (demo mode,
// self-service registration) are read from the running deployment, so one
// image serves demo and production alike.
export const dynamic = "force-dynamic";

// Server component: the settings decide here what the sign-in card offers.
// With demo mode off the browser receives no demo accounts at all, so the
// "Use a demo account" link is absent and the credentials are not in the
// page; with self-service registration off, "Create account" is absent.
export default async function LoginPage() {
  await ensureReady();
  const settings = await getSettings();
  const demoAccounts = settings.demoMode
    ? DEMO_ACCOUNTS.map(({ email, password, label }) => ({ email, password, label }))
    : [];
  return (
    <>
      <Suspense>
        <LoginForm
          demoAccounts={demoAccounts}
          selfServiceRegistration={settings.selfServiceRegistration}
        />
      </Suspense>
      <Footer />
    </>
  );
}
