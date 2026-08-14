import { redirect } from 'next/navigation';

import { getSession } from '@/lib/guards';
import {
  getApplicationForLearner,
  getInstitutions,
  getLearnerByUserId,
} from '@/lib/registry';

import { submitRegistration } from './actions';

/**
 * The learner registration form. Identity fields are prefilled from the
 * verified PID presentation (via the session's learner profile); documents
 * are sample references; the two consent decisions are separate and the
 * analytics one is optional by design.
 */
export default async function RegisterPage() {
  const session = await getSession();
  const learner = session ? getLearnerByUserId(session.user.id) : undefined;
  if (!learner) redirect('/education/login');

  const existing = getApplicationForLearner(learner.id);
  if (existing) redirect('/education/home');

  const schools = getInstitutions('school');
  const [firstName, ...rest] = learner.displayName.split(' ');
  let prefill: { dateOfBirth?: string; email?: string; address?: string } = {};
  try {
    prefill = learner.prefill ? JSON.parse(learner.prefill) : {};
  } catch {
    prefill = {};
  }

  return (
    <>
      <section className="edu-hero">
        <h1>Register as a learner</h1>
        <p>
          Your name comes from the identity your wallet presented{' '}
          <span className="integration-badge real">Verified by wallet</span>.
          Complete the rest of the application; a school officer will review
          your documents manually before the Ministry approves the enrolment.
        </p>
      </section>

      <div className="edu-card">
        <form action={submitRegistration}>
          <label>
            <span>First name (from your PID)</span>
            <input name="firstName" defaultValue={firstName ?? ''} required />
          </label>
          <label>
            <span>Family name (from your PID)</span>
            <input name="familyName" defaultValue={rest.join(' ')} required />
          </label>
          <label>
            <span>Date of birth (from your PID)</span>
            <input
              name="dateOfBirth"
              type="date"
              defaultValue={prefill.dateOfBirth ?? ''}
              required
            />
          </label>
          <label>
            <span>Contact email (from your PID)</span>
            <input
              name="email"
              type="email"
              defaultValue={prefill.email ?? ''}
              required
            />
          </label>
          <label>
            <span>Home address (from your PID)</span>
            <input name="address" defaultValue={prefill.address ?? ''} required />
          </label>
          <label>
            <span>School</span>
            <select name="institutionId" required>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Prior education (optional)</span>
            <input name="priorEducation" placeholder="Previous school and last completed year" />
          </label>
          <label>
            <span>Disability or special support needs (optional)</span>
            <input name="specialSupport" placeholder="Any support the school should plan for" />
          </label>

          <h2 style={{ marginTop: '1.75rem', fontSize: '1.1rem' }}>
            Document references{' '}
            <span className="integration-badge sandbox">Sandbox validation</span>
          </h2>
          <label>
            <span>Birth certificate or national ID reference</span>
            <input name="doc-birth-certificate" defaultValue="DOC-BC-2026-00417" required />
          </label>
          <label>
            <span>Proof of address reference</span>
            <input name="doc-proof-of-address" defaultValue="DOC-PA-2026-00291" required />
          </label>
          <label>
            <span>Photo reference</span>
            <input name="doc-photo" defaultValue="DOC-PH-2026-00113" required />
          </label>
          <label>
            <span>Previous school record reference (optional)</span>
            <input name="doc-prior-record" />
          </label>

          <h2 style={{ marginTop: '1.75rem', fontSize: '1.1rem' }}>
            Your data choices{' '}
            <span className="integration-badge real">Consent</span>
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Enrolment processing itself is a public task and needs no consent.
            These two choices are separate, optional, and can be withdrawn at
            any time. Declining them does not affect your registration.
          </p>
          <label style={{ fontWeight: 400 }}>
            <input type="checkbox" name="consentAnalytics" style={{ width: 'auto', marginRight: '0.5rem' }} />
            Allow anonymised use of my learner data for education analytics and
            policy planning.
          </label>
          <label style={{ fontWeight: 400 }}>
            <input type="checkbox" name="consentEmployerSharing" style={{ width: 'auto', marginRight: '0.5rem' }} />
            Allow sharing my qualification with an employer later, when I
            approve each request in my wallet.
          </label>

          <button type="submit">Submit registration</button>
        </form>
      </div>
    </>
  );
}
