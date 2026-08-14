/**
 * The hardcoded demo accounts, shown on the staff portal's
 * sign-in screen with click-to-fill (the marketplace pattern). The learner
 * has no account here on purpose: only the wallet PID flow signs a learner
 * in. The seed script creates exactly these accounts.
 */

export type DemoAccount = {
  email: string;
  password: string;
  name: string;
  role: 'school_officer';
  label: string;
};

export const DEMO_ACCOUNTS: Record<'school', DemoAccount> = {
  school: {
    email: 'officer@riverside.school',
    password: 'officer123',
    name: 'Amina Osei',
    role: 'school_officer',
    label: 'Admissions officer (document review, graduation decisions)',
  },
};
