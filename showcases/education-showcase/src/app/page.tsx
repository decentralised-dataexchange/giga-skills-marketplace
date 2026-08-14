import Link from 'next/link';

import { DEMO_STEPS } from '@/lib/demo-steps';
import { PORTALS } from '@/lib/portals';

import './landing.css';

/**
 * The showcase landing page. This is the only screen that admits to being a
 * demo: prerequisites, the portals, and step-by-step instructions to try
 * the whole journey. Each portal then presents itself as its own product.
 */


export default function Landing() {
  return (
    <main className="landing">
      <header className="landing-hero">
        <p className="landing-kicker">ITU / Giga education use case showcase</p>
        <h1>National Learner Registry &amp; Education Wallet</h1>
        <p className="landing-lede">
          One demonstration, three portals. A learner registers with a PID
          from an EUDI wallet, receives a Student ID and a diploma as
          verifiable credentials, confirms payment with a payment credential,
          and applies for a job with selective disclosure. Enrolment,
          issuance and revocation are processed automatically by the
          National Learner Registry; every step lands in its audit trail.
          Revocation closes the loop.
        </p>
      </header>

      <section className="landing-portals">
        <h2>The three portals</h2>
        <div className="landing-grid">
          {Object.values(PORTALS).map((portal) => (
            <Link
              key={portal.id}
              href={portal.id === 'education' ? '/education' : portal.homePath}
              className="landing-card"
            >
              <span className="landing-card-org">{portal.organisation}</span>
              <span className="landing-card-name">{portal.name}</span>
              <span className="landing-card-tagline">{portal.tagline}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-prereqs">
        <h2>Prerequisites</h2>
        <p className="landing-section-lede">
          Load these two credentials into the same EUDI Wallet on your phone
          before you start.
        </p>
        <div className="landing-grid landing-grid-two">
          <a
            className="landing-card"
            href="https://igrant.io/demo/pid.html"
            target="_blank"
            rel="noreferrer"
          >
            <span className="landing-card-org">1 · Identity</span>
            <span className="landing-card-name">Get a PID credential</span>
            <span className="landing-card-tagline">
              Issue a person identification credential to your wallet at
              igrant.io/demo/pid.html. It signs you in as the learner.
            </span>
          </a>
          <a
            className="landing-card"
            href="https://igrant.io/demo/ts12-payment-credential-issuance.html"
            target="_blank"
            rel="noreferrer"
          >
            <span className="landing-card-org">2 · Payment</span>
            <span className="landing-card-name">Get a payment credential</span>
            <span className="landing-card-tagline">
              Issue a TS12 payment account credential to the same wallet. It
              confirms the diploma fee.
            </span>
          </a>
        </div>
      </section>

      <section className="landing-journey">
        <h2>Try it out</h2>
        <p className="landing-section-lede">
          The whole journey takes 12 to 15 minutes. Follow the steps in order;
          every sign-in form is prefilled with its demo account.
        </p>
        <ol className="landing-steps">
          {DEMO_STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="landing-step-n">{index + 1}</span>
              <span className="landing-step-body">
                <span className="landing-step-title">{step.title}</span>
                <span className="landing-step-text">
                  {step.text}{' '}
                  <Link href={step.href}>{step.linkText} →</Link>
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="landing-fineprint">
          Every person, institution and identifier in this showcase is
          fictional.
        </p>
      </section>

    </main>
  );
}
