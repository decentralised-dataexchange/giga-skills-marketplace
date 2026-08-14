'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/guards';
import { schoolValidate } from '@/lib/registry';

export async function validateDocuments(formData: FormData): Promise<void> {
  const session = await requireRole('school_officer');
  await schoolValidate(String(formData.get('applicationId') ?? ''), {
    userId: session.user.id,
  });
  revalidatePath('/school/queue');
}
