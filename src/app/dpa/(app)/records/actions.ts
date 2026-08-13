'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/guards';
import { deleteAllConsents, getIndividualId } from '@/lib/consent';
import { getDb } from '@/lib/db';

/**
 * The right-to-be-forgotten procedure: privacy administration only.
 * Removes every consent record of the individual and the local mapping.
 */
export async function eraseConsents(formData: FormData): Promise<void> {
  const session = await requireRole('dpa_admin');
  const learnerId = String(formData.get('learnerId') ?? '');
  const individualId = getIndividualId(learnerId);
  if (!individualId) throw new Error('No consent records for this learner.');

  await deleteAllConsents(individualId, { userId: session.user.id });
  getDb()
    .prepare('DELETE FROM "consent_links" WHERE "learnerId" = ?')
    .run(learnerId);

  revalidatePath('/dpa/records');
}
