"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { EducationShell } from "@/components/showcase/education-shell";
import { WalletLogin } from "@/components/showcase/wallet-login";
import { useShowcaseStore } from "@/lib/showcase/use-store";

/**
 * Wallet sign-in screen: OpenID4VP PID presentation via the Ministry
 * sandbox. A visitor who still holds a learner session in this browser
 * skips the scan.
 */
export default function EducationLogin() {
  const router = useRouter();
  const { hydrated, sessionLearner } = useShowcaseStore();
  const signedIn = hydrated && sessionLearner !== null;

  useEffect(() => {
    if (signedIn) router.replace("/showcase/education/home");
  }, [signedIn, router]);

  return (
    <EducationShell>
      <div className="edu-login">{hydrated && !signedIn ? <WalletLogin /> : null}</div>
    </EducationShell>
  );
}
