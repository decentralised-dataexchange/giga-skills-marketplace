import Link from 'next/link';

import { PORTALS } from '@/lib/portals';

import './landing.css';

/**
 * The showcase landing page. This is the only screen that admits to being a
 * demo: it explains the journey, states what is real and what is sandboxed,
 * and links to the five portals. Each portal then presents itself as its own
 * product.
 */

const JOURNEY = [
  { step: '1', title: 'Set policy', where: 'Registrar Back Office', time: '1 min' },
  { step: '2', title: 'Register with your PID', where: 'National Education Portal', time: '3 min' },
  { step: '3', title: 'Review and approve', where: 'Riverside Admissions + Registrar', time: '3 min' },
  { step: '4', title: 'Diploma with TS12 payment', where: 'Registrar + Education Portal', time: '3 min' },
  { step: '5', title: 'Employer verification', where: 'CivicWorks Talent', time: '2 min' },
  { step: '6', title: 'Revocation proof', where: 'Registrar + CivicWorks', time: '2 min' },
];

export default function Landing() {
  return (
    <main className="landing">
      <header className="landing-hero">
        <p className="landing-kicker">ITU / Giga education use case showcase</p>
        <h1>National Learner Registry &amp; Education Wallet</h1>
        <p className="landing-lede">
          One demonstration, five portals. A learner registers with a PID from
          an EUDI wallet, receives a Student ID and a diploma as verifiable
          credentials, confirms payment with a TS12 payment credential, and an
          employer verifies the diploma with selective disclosure. Revocation
          closes the loop.
        </p>
      </header>

      <section className="landing-portals">
        <h2>The five portals</h2>
        <div className="landing-grid">
          {Object.values(PORTALS).map((portal) => (
            <Link
              key={portal.id}
              href={portal.id === 'education' ? '/education' : portal.loginPath}
              className="landing-card"
              style={{ borderColor: portal.brand.brand }}
            >
              <span className="landing-card-org">{portal.organisation}</span>
              <span className="landing-card-name">{portal.name}</span>
              <span className="landing-card-tagline">{portal.tagline}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-journey">
        <h2>The 12 to 15 minute journey</h2>
        <ol className="landing-steps">
          {JOURNEY.map((item) => (
            <li key={item.step}>
              <span className="landing-step-n">{item.step}</span>
              <span className="landing-step-title">{item.title}</span>
              <span className="landing-step-where">{item.where}</span>
              <span className="landing-step-time">{item.time}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-real">
        <h2>What is real, what is sandboxed</h2>
        <div className="landing-real-cols">
          <div>
            <h3>
              <span className="integration-badge real">Real</span>
            </h3>
            <ul>
              <li>PID wallet presentation (OpenID4VP)</li>
              <li>TS12 payment account presentation</li>
              <li>Credential issuance (OpenID4VCI, SD-JWT)</li>
              <li>Selective disclosure and revocation</li>
              <li>Consent Building Block agreements</li>
            </ul>
          </div>
          <div>
            <h3>
              <span className="integration-badge sandbox">Sandbox</span>
            </h3>
            <ul>
              <li>Civil registry and document validation</li>
              <li>Payment ledger (funds movement)</li>
              <li>Institution signature / trust service</li>
              <li>Education Service Registry</li>
              <li>Notifications and analytics</li>
            </ul>
          </div>
        </div>
        <p className="landing-prereq">
          Before the demo, load a PID from{' '}
          <a href="https://igrant.io/demo/pid.html">igrant.io/demo/pid.html</a>{' '}
          and a payment credential from{' '}
          <a href="https://igrant.io/demo/ts12-payment-credential-issuance.html">
            igrant.io/demo/ts12-payment-credential-issuance.html
          </a>{' '}
          into the same wallet. Every person, institution and identifier in
          this showcase is fictional.
        </p>
      </section>
    </main>
  );
}
