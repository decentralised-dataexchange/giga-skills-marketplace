'use server';

import { redirect } from 'next/navigation';

import { requireRole } from '@/lib/guards';
import { getLearnerByUserId, submitApplication } from '@/lib/registry';

/**
 * Submit the learner registration. The identity comes from the PID session;
 * the form carries the RFQ's registration data, the document references and
 * the two separate consent decisions. Declining analytics never blocks.
 */
export async function submitRegistration(formData: FormData): Promise<void> {
  const session = await requireRole('learner');
  const learner = getLearnerByUserId(session.user.id);
  if (!learner) throw new Error('No learner profile for this session.');

  const documents = ['birth-certificate', 'proof-of-address', 'photo', 'prior-record']
    .map((name) => String(formData.get(`doc-${name}`) ?? '').trim())
    .filter(Boolean);

  submitApplication({
    learner,
    institutionId: String(formData.get('institutionId') ?? ''),
    form: {
      firstName: String(formData.get('firstName') ?? ''),
      familyName: String(formData.get('familyName') ?? ''),
      dateOfBirth: String(formData.get('dateOfBirth') ?? ''),
      email: String(formData.get('email') ?? ''),
      address: String(formData.get('address') ?? ''),
      priorEducation: String(formData.get('priorEducation') ?? ''),
      specialSupport: String(formData.get('specialSupport') ?? ''),
      consentAnalytics: formData.get('consentAnalytics') === 'on',
      consentEmployerSharing: formData.get('consentEmployerSharing') === 'on',
    },
    documents,
  });

  redirect('/education/home');
}
