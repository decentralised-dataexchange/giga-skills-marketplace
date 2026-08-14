/**
 * The try-it-out walkthrough, shared by the landing page and the floating
 * demo guide. Plain data so both surfaces render it in their own style.
 */
export const DEMO_STEPS = [
  {
    title: 'Register as a learner',
    text: 'Open the National Education Portal and sign in with your wallet: scan the code with your EUDI Wallet and share your PID. Then complete and submit the registration form.',
    href: '/education',
    linkText: 'National Education Portal',
  },
  {
    title: 'Review the documents; enrolment is automatic',
    text: 'In Riverside Admissions, validate the documents. The registry then enrols the learner automatically: the learner identifier is generated and the Student ID is offered. Back in the Education Portal, scan the Student ID offer and type the transaction code shown under the QR.',
    href: '/school/queue',
    linkText: 'Riverside Admissions',
  },
  {
    title: 'Graduate, pay, and receive the diploma',
    text: 'In Riverside Admissions, submit the graduation decision. The registry validates the institution automatically and the fee falls due. In the Education Portal, choose to pay from your account or by card: one scan pays the EUR 50 fee with your payment credential and delivers the diploma to your wallet.',
    href: '/school/graduation',
    linkText: 'Graduation decisions',
  },
  {
    title: 'Apply for a job with your diploma',
    text: 'Open CivicWorks Careers, pick a role and apply with your wallet. Share the five requested fields; your application is verified in seconds.',
    href: '/civicworks',
    linkText: 'CivicWorks Careers',
  },
  {
    title: 'Revoke and see trust in action',
    text: 'In Riverside Admissions, revoke the issued diploma; the registry processes it immediately and permanently. Apply again at CivicWorks: the application must now be rejected. Close on the registry audit trail, which recorded every step, including the automatic processing.',
    href: '/audit',
    linkText: 'Registry audit trail',
  },
] as const;
