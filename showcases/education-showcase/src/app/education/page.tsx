import Link from "next/link";
import { cookies } from "next/headers";

import { EducationShell } from "@/components/EducationShell";
import { getSession } from "@/lib/guards";
import { stashCookieName } from "@/lib/portal-sessions";

export default async function EducationLanding() {
  const session = await getSession();
  // Signed in, or restorable: this page is public, so the middleware does
  // not swap a stashed learner session in here. A stashed session means
  // /education/home will restore it without a fresh wallet sign-in.
  const signedIn =
    (session?.user as { role?: string } | undefined)?.role === "learner" ||
    (await cookies()).has(stashCookieName("learner"));

  return (
    <EducationShell signedIn={signedIn}>
      <section className="edu-hero">
        <h1>Your education records, in your own wallet</h1>
        <p>
          Register as a learner, follow your enrolment, and receive your Student ID and diploma as
          verifiable credentials you hold yourself. Sign in with the identity wallet on your phone;
          no account or password is needed.
        </p>
        <Link
          className="edu-cta hint-pulse"
          href={signedIn ? "/education/home" : "/education/login"}
        >
          {signedIn ? "Go to my education" : "Sign in with your wallet"}
        </Link>
      </section>

      <div className="edu-services">
        <div className="edu-service">
          <h3>Register as a learner</h3>
          <p>
            Enrol in the National Learner Registry with attributes confirmed by your identity
            wallet.
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
