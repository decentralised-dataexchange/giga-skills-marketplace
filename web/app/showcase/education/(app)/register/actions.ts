"use server";

import { recordRegistrationConsents } from "@/lib/showcase/server/consent";

/**
 * Record the registration's consent decisions at the Consent Building Block
 * and return the individual id for the browser to remember. Identity is
 * client-asserted (a pairwise pseudonym), which is acceptable for this
 * fictional demo: the individual carries no PID attribute.
 */
export async function recordConsents(
  learner: { pseudonym: string; displayName: string },
  choices: { analytics: boolean; employerSharing: boolean },
): Promise<string> {
  return recordRegistrationConsents(learner, choices);
}
