import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';

import { DEMO_STEPS, PREREQUISITES, WHO_SIGNS_IN, stepColour } from '@/lib/demo-steps';
import { PORTALS } from '@/lib/portals';

import './landing.css';

/**
 * The showcase landing page. This is the only screen that admits to being a
 * demo: prerequisites, the portals, and step-by-step instructions to try
 * the whole journey. Each portal then presents itself as its own product.
 * It renders the same cards and steps as the floating demo guide (shared
 * guide-* styles and data), so the two surfaces read identically.
 */

export default function Landing() {
  return (
    <main className="landing">
      <header className="landing-hero">
        <p className="landing-kicker">ITU / Giga education use case showcase</p>
        <h1>National Learner Registry &amp; Education Wallet</h1>
        <p className="landing-lede">
          One demonstration, three portals. A learner registers with a PID
          from a Wallet, receives a Student ID and a diploma as
          verifiable credentials, confirms payment with a payment credential,
          and applies for a job with selective disclosure. Enrolment,
          issuance and revocation are processed automatically by the
          National Learner Registry; every step lands in its audit trail.
          Revocation closes the loop.
        </p>
      </header>

      <section className="landing-section">
        <h2 className="guide-heading">
          <span className="guide-heading-n">1</span> Before you start
        </h2>
        <p className="guide-lede">
          Download a Wallet app on your phone, then load these two credentials into it.
        </p>
        <div className="guide-prereqs">
          {PREREQUISITES.map((item) => (
            <a
              key={item.name}
              className="guide-prereq"
              href={item.href}
              target="_blank"
              rel="noreferrer"
            >
              <span className="guide-prereq-text">
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
              </span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2 className="guide-heading">
          <span className="guide-heading-n">2</span> The portals
        </h2>
        <p className="guide-lede">
          Three organisations, one journey. Sessions persist per portal, so
          you can switch freely.
        </p>
        <div className="guide-portals">
          {Object.values(PORTALS).map((portal) => (
            <Link
              key={portal.id}
              href={portal.id === 'education' ? '/education' : portal.homePath}
              className="guide-portal"
            >
              <span
                className="guide-portal-mark"
                style={{ background: portal.brand['brand-soft'] }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={portal.logo} alt="" />
              </span>
              <span className="guide-portal-text">
                <strong>{portal.name}</strong>
                <small>
                  {portal.organisation} · {WHO_SIGNS_IN[portal.id]}
                </small>
              </span>
              <ArrowRight size={15} className="guide-portal-go" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2 className="guide-heading">
          <span className="guide-heading-n">3</span> The walkthrough
        </h2>
        <p className="guide-lede">
          Five steps, about 12 minutes. Follow them in order; every sign-in
          form is prefilled with its demo account, and the pulsing highlight
          on each screen marks the next thing to click.
        </p>
        <ol className="guide-steps">
          {DEMO_STEPS.map((step, index) => (
            <li key={step.title}>
              <span
                className="guide-step-n"
                style={{ background: stepColour(step.href) }}
              >
                {index + 1}
              </span>
              <span className="guide-step-body">
                <span className="guide-step-title">{step.title}</span>
                <span className="guide-step-text">{step.text}</span>
                <Link
                  className="guide-step-link"
                  href={step.href}
                  style={{ color: stepColour(step.href) }}
                >
                  {step.linkText} <ArrowRight size={13} aria-hidden="true" />
                </Link>
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
