"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { EducationShell } from "@/components/showcase/education-shell";
import { useShowcaseStore } from "@/lib/showcase/use-store";

/**
 * Client-side guard for the signed-in learner pages. The session is the
 * browser's own fake localStorage session, so the check happens here: no
 * session means back to the wallet sign-in. Nothing renders until the store
 * has hydrated, so the guard never misfires during hydration.
 */
export default function EducationAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hydrated, sessionLearner } = useShowcaseStore();

  useEffect(() => {
    if (hydrated && !sessionLearner) router.replace("/showcase/education/login");
  }, [hydrated, sessionLearner, router]);

  if (!hydrated || !sessionLearner) return null;
  return <EducationShell>{children}</EducationShell>;
}
