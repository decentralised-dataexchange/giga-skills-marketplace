'use server';

import { requireRole } from '@/lib/guards';
import {
  getApplicationForLearner,
  getLearnerByUserId,
  startPaymentConfirmation,
} from '@/lib/registry';

/** Start the TS12 payment confirmation for the learner's own application. */
export async function startPayment(
  method: 'account' | 'card'
): Promise<{ exchangeId: string; qrUri: string }> {
  const session = await requireRole('learner');
  const learner = getLearnerByUserId(session.user.id);
  if (!learner) throw new Error('No learner profile.');
  const app = getApplicationForLearner(learner.id);
  if (!app) throw new Error('No application.');
  return startPaymentConfirmation(app.id, { userId: session.user.id }, method);
}
