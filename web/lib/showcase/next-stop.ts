"use client";

/**
 * Where the demo journey continues right now, derived from the latest
 * application's state in the browser store. The demo guide uses this to
 * annotate its portal rows, so nobody is left on a screen with nothing to
 * click.
 */

import {
  getDiplomaExchange,
  isExchangeAccepted,
  latestApplication,
  type ShowcaseState,
} from "@/lib/showcase/store";

export type NextStop = {
  href: string;
  /** The portal the action belongs to; null for the public audit trail. */
  portalId: "education" | "school" | "civicworks" | null;
  label: string;
};

export function getNextStop(state: ShowcaseState): NextStop | null {
  const app = latestApplication(state);

  if (!app) {
    return {
      href: "/showcase/education",
      portalId: "education",
      label: "Register as a learner in the National Education Portal",
    };
  }

  switch (app.status) {
    case "submitted":
      return {
        href: "/showcase/school/queue",
        portalId: "school",
        label: "Validate the documents in Riverside Admissions",
      };
    case "approved":
      if (
        app.form.studentIdExchangeId &&
        !isExchangeAccepted(state, app.form.studentIdExchangeId)
      ) {
        return {
          href: "/showcase/education/home",
          portalId: "education",
          label: "Scan the Student ID offer in the Education Portal",
        };
      }
      return {
        href: "/showcase/school/graduation",
        portalId: "school",
        label: "Submit the graduation decision in Riverside Admissions",
      };
    case "payment_pending":
      return {
        href: "/showcase/education/home",
        portalId: "education",
        label: "Pay the diploma fee in the Education Portal",
      };
    case "issued": {
      if (app.form.diplomaExchangeId && !isExchangeAccepted(state, app.form.diplomaExchangeId)) {
        return {
          href: "/showcase/education/home",
          portalId: "education",
          label: "Add the diploma to the wallet in the Education Portal",
        };
      }
      if (getDiplomaExchange(state, app.id)?.revoked) {
        return {
          href: "/showcase/audit",
          portalId: null,
          label: "Apply again at CivicWorks, then close on the audit trail",
        };
      }
      return {
        href: "/showcase/civicworks",
        portalId: "civicworks",
        label: "Apply for a job at CivicWorks Careers",
      };
    }
    default:
      return null;
  }
}
