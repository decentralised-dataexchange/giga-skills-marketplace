'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/guards';
import { submitGraduation } from '@/lib/registry';

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
