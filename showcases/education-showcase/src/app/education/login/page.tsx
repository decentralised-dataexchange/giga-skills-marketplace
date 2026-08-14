import { redirect } from "next/navigation";

import { EducationShell } from "@/components/EducationShell";
import { WalletLogin } from "@/components/WalletLogin";
import { hasRestorableSession } from "@/lib/portal-sessions";

/**
 * Wallet sign-in screen: OpenID4VP PID presentation via the Ministry sandbox.
 * A visitor who still holds a valid stashed learner session skips the scan:
 * the home page swaps it back in through the middleware.
 */
export default async function EducationLogin() {
  if (await hasRestorableSession("learner")) {
    redirect("/education/home");
  }

  return (
    <EducationShell signedIn={false}>
      <div className="edu-login">
        <WalletLogin />
      </div>
    </EducationShell>
  );
}
