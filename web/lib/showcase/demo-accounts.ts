/**
 * The hardcoded demo accounts, prefilled straight into the staff portal's
 * sign-in form so an evaluator only presses the sign-in button. The learner
 * has no account here on purpose: only the wallet PID flow signs a learner
 * in. Fake demo authentication: the credentials are checked in the browser
 * and nothing is verified server-side, which is acceptable because every
 * portal here is a fictional demo.
 */

export type DemoAccount = {
  email: string;
  password: string;
  name: string;
  role: "school_officer";
  label: string;
};

export const DEMO_ACCOUNTS: Record<"school", DemoAccount> = {
  school: {
    email: "officer@riverside.school",
    password: "officer123",
    name: "Amina Osei",
    role: "school_officer",
    label: "Admissions officer (document review, graduation decisions)",
  },
};
