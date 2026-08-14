"use server";

import { requireRole } from "@/lib/guards";
import {
  getApplicationForLearner,
  getLearnerByUserId,
  startDiplomaPaymentIssuance,
} from "@/lib/registry";

/**
 * Start the paid diploma issuance (dynamic credential request) for the
 * learner's own application, with the chosen payment method.
 */
export async function startPayment(
  method: "account" | "card",
): Promise<{ exchangeId: string; qrUri: string }> {
  const session = await requireRole("learner");
  const learner = getLearnerByUserId(session.user.id);
  if (!learner) throw new Error("No learner profile.");
  const app = getApplicationForLearner(learner.id);
  if (!app) throw new Error("No application.");
  return startDiplomaPaymentIssuance(app.id, { userId: session.user.id }, method);
}
