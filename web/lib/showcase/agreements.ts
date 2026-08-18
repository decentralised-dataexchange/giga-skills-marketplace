/**
 * The three data agreements of the education showcase, as shown to the
 * learner. Client-safe on purpose: only titles, descriptions and the names
 * of the environment variables that hold the deployment's agreement ids.
 * The Consent Building Block calls themselves live in the server broker.
 */

export const AGREEMENTS = [
  {
    envVar: "AGREEMENT_ENROLMENT_ID",
    key: "enrolment",
    title: "Core enrolment processing",
    lawfulBasis: "public_task",
    optional: false,
    description:
      "Registration, review, approval and credential issuance. A public task: it does not depend on consent.",
  },
  {
    envVar: "AGREEMENT_ANALYTICS_ID",
    key: "analytics",
    title: "Anonymised education analytics",
    lawfulBasis: "consent",
    optional: true,
    description:
      "Optional anonymised statistics for policy planning. Declining never affects your registration.",
  },
  {
    envVar: "AGREEMENT_EMPLOYER_ID",
    key: "employer",
    title: "Employer qualification sharing",
    lawfulBasis: "consent",
    optional: true,
    description:
      "Optional later sharing of your qualification with an employer; every share still needs your wallet approval.",
  },
] as const;

export type AgreementKey = (typeof AGREEMENTS)[number]["key"];

export type ConsentState = {
  key: string;
  title: string;
  lawfulBasis: string;
  optional: boolean;
  description: string;
  optIn: boolean | null;
};
