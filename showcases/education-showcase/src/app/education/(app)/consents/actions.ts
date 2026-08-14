"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { getLearnerByUserId } from "@/lib/registry";
import {
  AGREEMENTS,
  agreementId,
  deleteAllConsents,
  ensureIndividual,
  getIndividualId,
  setConsent,
} from "@/lib/consent";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";

/** Allow or withdraw one of the two optional agreements. */
export async function updateConsent(formData: FormData): Promise<void> {
  const session = await requireRole("learner");
  const learner = getLearnerByUserId(session.user.id);
  if (!learner) throw new Error("No learner profile.");

  const key = String(formData.get("agreement") ?? "");
  const optIn = formData.get("optIn") === "true";
  const agreement = AGREEMENTS.find((entry) => entry.key === key);
  if (!agreement || !agreement.optional) {
    throw new Error("This agreement cannot be changed here.");
  }

  const individualId = await ensureIndividual(learner);
  await setConsent(individualId, agreementId(agreement.envVar), optIn);

  audit({
    actorUserId: session.user.id,
    actorRole: "learner",
    action: optIn ? "consent.given" : "consent.withdrawn",
    subjectType: "agreement",
    subjectId: agreement.key,
  });

  revalidatePath("/education/consents");
}

/**
 * Delete the learner's account: remote consent records (best effort), the
 * application, exchange correlations, the learner profile, and the sign-in
 * account itself (sessions cascade). Wallet credentials are untouched; the
 * audit event is written before the identity disappears, without naming it.
 */
export async function deleteMyAccount(): Promise<void> {
  const session = await requireRole("learner");
  const learner = getLearnerByUserId(session.user.id);
  if (!learner) throw new Error("No learner profile.");

  const individualId = getIndividualId(learner.id);
  if (individualId) {
    try {
      await deleteAllConsents(individualId, {
        userId: session.user.id,
        role: "learner",
      });
    } catch {
      // The account deletion proceeds regardless.
    }
  }

  audit({
    actorUserId: session.user.id,
    actorRole: "learner",
    action: "learner.account_deleted",
    subjectType: "learner",
    subjectId: "redacted",
  });

  const db = getDb();
  const wipe = db.transaction(() => {
    db.prepare('DELETE FROM "consent_links" WHERE "learnerId" = ?').run(learner.id);
    db.prepare('DELETE FROM "credential_exchanges" WHERE "learnerId" = ?').run(learner.id);
    db.prepare('DELETE FROM "applications" WHERE "learnerId" = ?').run(learner.id);
    db.prepare('DELETE FROM "login_tokens" WHERE "userId" = ?').run(learner.userId);
    db.prepare('DELETE FROM "learners" WHERE "id" = ?').run(learner.id);
    // Sessions and accounts cascade with the user row; the browser session
    // stops resolving immediately.
    db.prepare('DELETE FROM "user" WHERE "id" = ?').run(learner.userId);
  });
  wipe();

  redirect("/education");
}
