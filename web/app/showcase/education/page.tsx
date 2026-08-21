"use client";

import Link from "next/link";

import { EducationShell } from "@/components/showcase/education-shell";
import { PortalLink } from "@/components/showcase/portal-link";
import { useShowcaseStore } from "@/lib/showcase/use-store";

export default function EducationLanding() {
  const { hydrated, sessionLearner } = useShowcaseStore();
  const signedIn = hydrated && sessionLearner !== null;

  return (
    <EducationShell>
      <section className="edu-hero">
        <h1>Your education records, in your own wallet</h1>
        <p>
          Register as a learner, follow your enrolment, and receive your Student ID and diploma as
          verifiable credentials you hold yourself. Sign in with the identity wallet on your phone;
          no account or password is needed.
        </p>
        <Link
          className="edu-cta hint-pulse"
          href={signedIn ? "/showcase/education/home" : "/showcase/education/login"}
        >
          {signedIn ? "Go to my education" : "Sign in with your wallet"}
        </Link>
      </section>

      <div className="edu-services">
        <div className="edu-service">
          <h3>Register as a learner</h3>
          <p>
            Enrol in the{" "}
            <PortalLink href="/showcase/audit">National Learner Registry</PortalLink> with
            attributes confirmed by your identity wallet.
          </p>
        </div>
        <div className="edu-service">
          <h3>Receive credentials</h3>
          <p>
            Your Student ID and diploma arrive in your wallet as selectively disclosable
            credentials.
          </p>
        </div>
        <div className="edu-service">
          <h3>Share on your terms</h3>
          <p>Employers see only the fields they ask for and you approve; nothing more.</p>
        </div>
      </div>
    </EducationShell>
  );
}
