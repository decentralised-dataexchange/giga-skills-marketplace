"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PORTALS } from "@/lib/showcase/portals";
import { DEMO_ACCOUNTS } from "@/lib/showcase/demo-accounts";
import { StaffLoginForm } from "@/components/showcase/staff-login-form";
import { useShowcaseStore } from "@/lib/showcase/use-store";

export default function SchoolLogin() {
  const router = useRouter();
  const portal = PORTALS.school;
  const { hydrated, sessionSchool } = useShowcaseStore();

  // A still-valid officer session in this browser skips the sign-in.
  useEffect(() => {
    if (hydrated && sessionSchool) router.replace(portal.homePath);
  }, [hydrated, sessionSchool, router, portal.homePath]);

  return (
    <div className="sch-login">
      <div className="sch-login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portal.logo} alt="" />
        <h1>{portal.organisation}</h1>
        <p>Admissions office staff sign-in</p>
        <StaffLoginForm
          homePath={portal.homePath}
          buttonLabel="Open workbench"
          demoAccount={DEMO_ACCOUNTS.school}
        />
      </div>
    </div>
  );
}
