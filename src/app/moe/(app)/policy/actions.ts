'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/guards';
import { PAYMENT_REQUIRED_KEY, getPolicy, setPolicy } from '@/lib/policy';

/**
 * Toggle "payment confirmation required for diploma issuance".
 * Registrar-only; every change lands in the audit log.
 */
export async function togglePaymentRequired(): Promise<void> {
  const session = await requireRole('registrar');

  const current = getPolicy(PAYMENT_REQUIRED_KEY, 'false') === 'true';
  setPolicy(PAYMENT_REQUIRED_KEY, current ? 'false' : 'true', {
    userId: session.user.id,
    role: 'registrar',
  });

  revalidatePath('/moe/policy');
}
