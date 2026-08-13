/**
 * The hardcoded demo accounts, one per staff portal, shown on each portal's
 * sign-in screen with click-to-fill (the marketplace pattern). The learner
 * has no account here on purpose: only the wallet PID flow signs a learner
 * in. The seed script creates exactly these accounts.
 */

export type DemoAccount = {
  email: string;
  password: string;
  name: string;
  role: 'school_officer' | 'registrar' | 'dpa_admin' | 'employer_verifier';
  label: string;
};

export const DEMO_ACCOUNTS: Record<
  'school' | 'moe' | 'dpa' | 'civicworks',
  DemoAccount
> = {
  school: {
    email: 'officer@riverside.school',
    password: 'officer123',
    name: 'Amina Osei',
    role: 'school_officer',
    label: 'Admissions officer (document review, graduation decisions)',
  },
  moe: {
    email: 'registrar@moe.gov',
    password: 'registrar123',
    name: 'Daniel Mensah',
    role: 'registrar',
    label: 'MoE registrar (approvals, issuance, revocation, policy)',
  },
  dpa: {
    email: 'oversight@dpa.gov',
    password: 'oversight123',
    name: 'Leena Virtanen',
    role: 'dpa_admin',
    label: 'Privacy supervisor (consent oversight, erasure)',
  },
  civicworks: {
    email: 'hr@civicworks.example',
    password: 'civicworks123',
    name: 'Sofia Lindqvist',
    role: 'employer_verifier',
    label: 'HR verifier (qualification checks)',
  },
};
