'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/guards';
import { moeProcessGraduation, revokeDiploma } from '@/lib/registry';

export async function processGraduation(formData: FormData): Promise<void> {
  const session = await requireRole('registrar');
  await moeProcessGraduation(String(formData.get('applicationId') ?? ''), {
    userId: session.user.id,
  });
  revalidatePath('/moe/issuance');
}

export async function revokeIssuedDiploma(formData: FormData): Promise<void> {
  const session = await requireRole('registrar');
  await revokeDiploma(String(formData.get('applicationId') ?? ''), {
    userId: session.user.id,
  });
  revalidatePath('/moe/issuance');
}
