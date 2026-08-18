/**
 * The demo script, shared by the showcase landing page and the floating demo
 * guide: the wallet prerequisites, who signs in where, the walkthrough steps,
 * and the portal colour of each step. One source, so the two surfaces always
 * read the same.
 */
import { PORTALS } from "@/lib/showcase/portals";

export const PREREQUISITES = [
  {
    name: "iGrant.io Data Wallet",
    detail: "Download a Wallet app; instructions here",
    href: "https://docs.igrant.io/docs/data-wallet-tryitout/",
  },
  {
    name: "PID credential",
    detail: "Signs you in as the learner",
    href: "https://igrant.io/demo/pid.html",
  },
  {
    name: "TS12 payment credential",
    detail: "Pays the diploma fee",
    href: "https://igrant.io/demo/ts12-payment-credential-issuance.html",
  },
] as const;

export const WHO_SIGNS_IN: Record<string, string> = {
  education: "Learner · wallet sign-in",
  school: "School officer · password",
  civicworks: "Public · no sign-in",
};

/** The brand colour of the portal a step happens in, for its number chip. */
export function stepColour(href: string): string {
  const portal = Object.values(PORTALS).find((p) => href.startsWith(`/showcase/${p.id}`));
  return portal?.brand.brand ?? "#1c2130";
}

export const DEMO_STEPS = [
  {
    title: "Register as a learner",
    text: "Open the National Education Portal and sign in with your wallet: scan the code with your Wallet and share your PID. Then complete and submit the registration form.",
    href: "/showcase/education",
    linkText: "National Education Portal",
  },
  {
    title: "Review the documents; enrolment is automatic",
    text: "In Riverside Admissions, validate the documents. The registry then enrols the learner automatically: the learner identifier is generated and the Student ID is offered. Back in the Education Portal, scan the Student ID offer and type the transaction code shown under the QR.",
    href: "/showcase/school/queue",
    linkText: "Riverside Admissions",
  },
  {
    title: "Graduate, pay, and receive the diploma",
    text: "In Riverside Admissions, submit the graduation decision. The registry validates the institution automatically and the fee falls due. In the Education Portal, choose to pay from your account or by card: one scan pays the EUR 50 fee with your payment credential and delivers the diploma to your wallet.",
    href: "/showcase/school/graduation",
    linkText: "Graduation decisions",
  },
  {
    title: "Apply for a job with your diploma",
    text: "Open CivicWorks Careers, pick a role and apply with your wallet. Share the five requested fields; your application is verified in seconds.",
    href: "/showcase/civicworks",
    linkText: "CivicWorks Careers",
  },
  {
    title: "Revoke and see trust in action",
    text: "In Riverside Admissions, revoke the issued diploma; the registry processes it immediately and permanently. Apply again at CivicWorks: the application must now be rejected. Close on the registry audit trail, which recorded every step, including the automatic processing.",
    href: "/showcase/audit",
    linkText: "Registry audit trail",
  },
] as const;
