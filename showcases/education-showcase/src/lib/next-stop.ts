import "server-only";

import { getDb } from "@/lib/db";
import { getDiplomaExchange, isExchangeAccepted } from "@/lib/registry";

/**
 * Where the demo journey continues right now, derived from the latest
 * application's state. The demo guide uses this to annotate its floating
 * button whenever the next action lives in a different portal, so nobody
 * is left on a screen with nothing to click.
 */
export type NextStop = {
  href: string;
  /** The portal the action belongs to; null for the public audit trail. */
  portalId: "education" | "school" | "civicworks" | null;
  label: string;
};

export function getNextStop(): NextStop | null {
  const db = getDb();
  const app = db.prepare('SELECT * FROM "applications" ORDER BY "createdAt" DESC LIMIT 1').get() as
    | { id: string; status: string; form: string }
    | undefined;

  if (!app) {
    return {
      href: "/education",
      portalId: "education",
      label: "Register as a learner in the National Education Portal",
    };
  }

  const form = JSON.parse(app.form) as Record<string, unknown>;

  switch (app.status) {
    case "submitted":
      return {
        href: "/school/queue",
        portalId: "school",
        label: "Validate the documents in Riverside Admissions",
      };
    case "approved":
      if (
        typeof form.studentIdExchangeId === "string" &&
        !isExchangeAccepted(form.studentIdExchangeId)
      ) {
        return {
          href: "/education/home",
          portalId: "education",
          label: "Scan the Student ID offer in the Education Portal",
        };
      }
      return {
        href: "/school/graduation",
        portalId: "school",
        label: "Submit the graduation decision in Riverside Admissions",
      };
    case "payment_pending":
      return {
        href: "/education/home",
        portalId: "education",
        label: "Pay the diploma fee in the Education Portal",
      };
    case "issued": {
      if (
        typeof form.diplomaExchangeId === "string" &&
        !isExchangeAccepted(form.diplomaExchangeId)
      ) {
        return {
          href: "/education/home",
          portalId: "education",
          label: "Add the diploma to the wallet in the Education Portal",
        };
      }
      if (getDiplomaExchange(app.id)?.revoked) {
        return {
          href: "/audit",
          portalId: null,
          label: "Apply again at CivicWorks, then close on the audit trail",
        };
      }
      return {
        href: "/civicworks",
        portalId: "civicworks",
        label: "Apply for a job at CivicWorks Careers",
      };
    }
    default:
      return null;
  }
}
