"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useShowcaseStore } from "@/lib/showcase/use-store";

/**
 * Client-side guard for the officer workbench. The session is the browser's
 * own fake localStorage session; no session means back to the sign-in.
 */
export default function SchoolAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hydrated, sessionSchool } = useShowcaseStore();

  useEffect(() => {
    if (hydrated && !sessionSchool) router.replace("/showcase/school/login");
  }, [hydrated, sessionSchool, router]);

  if (!hydrated || !sessionSchool) return null;
  return <>{children}</>;
}
