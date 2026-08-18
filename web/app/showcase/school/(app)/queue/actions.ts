"use server";

import { issueStudentIdCredential, type StudentIdClaims } from "@/lib/showcase/server/issuance";
import { readConsents } from "@/lib/showcase/server/consent";
import type { ConsentState } from "@/lib/showcase/agreements";

/**
 * Brokers for the review queue. The registry state machine runs in the
 * browser; validation there yields the ULID and claims, and this action
 * turns them into a real OWS Student ID offer. Identity is client-asserted,
 * acceptable for this fictional demo.
 */

export async function issueStudentId(
  claims: StudentIdClaims,
): Promise<{ exchangeId: string; offer: string; pin: string }> {
  return issueStudentIdCredential(claims);
}

/** Live consent states from the Consent Building Block, for the review pane. */
export async function readLearnerConsents(individualId: string): Promise<ConsentState[]> {
  return readConsents(individualId);
}
