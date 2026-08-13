'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/guards';
import { registrarApprove } from '@/lib/registry';

export async function approveEnrolment(formData: FormData): Promise<void> {
  const session = await requireRole('registrar');
  await registrarApprove(String(formData.get('applicationId') ?? ''), {
    userId: session.user.id,
  });
  revalidatePath('/moe/approvals');
}
