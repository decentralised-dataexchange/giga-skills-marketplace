'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/guards';
import { getLearnerByUserId } from '@/lib/registry';
import {
  AGREEMENTS,
  agreementId,
  ensureIndividual,
  setConsent,
} from '@/lib/consent';
import { audit } from '@/lib/audit';

/** Allow or withdraw one of the two optional agreements. */
export async function updateConsent(formData: FormData): Promise<void> {
  const session = await requireRole('learner');
  const learner = getLearnerByUserId(session.user.id);
  if (!learner) throw new Error('No learner profile.');

  const key = String(formData.get('agreement') ?? '');
  const optIn = formData.get('optIn') === 'true';
  const agreement = AGREEMENTS.find((entry) => entry.key === key);
  if (!agreement || !agreement.optional) {
    throw new Error('This agreement cannot be changed here.');
  }

  const individualId = await ensureIndividual(learner);
  await setConsent(individualId, agreementId(agreement.envVar), optIn);

  audit({
    actorUserId: session.user.id,
    actorRole: 'learner',
    action: optIn ? 'consent.given' : 'consent.withdrawn',
    subjectType: 'agreement',
    subjectId: agreement.key,
  });

  revalidatePath('/education/consents');
}
