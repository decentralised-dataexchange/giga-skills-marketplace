"use server";

import { AGREEMENTS, type ConsentState } from "@/lib/showcase/agreements";
import {
  agreementId,
  deleteAllConsents,
  ensureIndividual,
  readConsents,
  setConsent,
} from "@/lib/showcase/server/consent";

/**
 * Consent brokers for the learner's data-choices page. Identity (the
 * pairwise pseudonym / individual id) is client-asserted, which is
 * acceptable for this fictional demo: the individuals exist only for
 * showcase runs and carry no PID attribute.
 */

/** The live consent states for one individual. */
export async function readConsentStates(individualId: string): Promise<ConsentState[]> {
  return readConsents(individualId);
}

/** Allow or withdraw one of the two optional agreements. */
export async function updateConsentChoice(
  learner: { pseudonym: string; displayName: string },
  key: string,
  optIn: boolean,
): Promise<string> {
  const agreement = AGREEMENTS.find((entry) => entry.key === key);
  if (!agreement || !agreement.optional) {
    throw new Error("This agreement cannot be changed here.");
  }
  const individualId = await ensureIndividual(learner);
  await setConsent(individualId, agreementId(agreement.envVar), optIn);
  return individualId;
}

/** Right to be forgotten: delete every consent record of one individual. */
export async function eraseAllConsents(individualId: string): Promise<void> {
  await deleteAllConsents(individualId);
}
