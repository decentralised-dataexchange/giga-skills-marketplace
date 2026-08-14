'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/guards';
import { revokeDiploma, submitGraduation } from '@/lib/registry';

export async function submitGraduationDecision(formData: FormData): Promise<void> {
  const session = await requireRole('school_officer');
  submitGraduation(
    String(formData.get('applicationId') ?? ''),
    {
      programme: String(formData.get('programme') ?? ''),
      qualificationCode: String(formData.get('qualificationCode') ?? ''),
      result: String(formData.get('result') ?? ''),
      decisionText: String(formData.get('decisionText') ?? ''),
    },
    { userId: session.user.id }
  );
  revalidatePath('/school/graduation');
}

/**
 * Permanently revoke an issued diploma. The registry processes the request
 * immediately; a fresh employer verification then rejects the credential.
 */
export async function revokeIssuedDiploma(formData: FormData): Promise<void> {
  const session = await requireRole('school_officer');
  await revokeDiploma(String(formData.get('applicationId') ?? ''), {
    userId: session.user.id,
  });
  revalidatePath('/school/graduation');
}
