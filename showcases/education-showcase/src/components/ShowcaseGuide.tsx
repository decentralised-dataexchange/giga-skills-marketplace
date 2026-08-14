'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, BookOpen, ExternalLink } from 'lucide-react';

import { Drawer } from '@/components/Drawer';
import { DEMO_STEPS } from '@/lib/demo-steps';
import { PORTALS, type PortalConfig } from '@/lib/portals';

/**
 * The showcase overlay on every portal: one floating button that opens a
 * wide drawer with the prerequisites, the portal switcher and the
 * walkthrough, so the demo can move between the organisations and always
 * see the next step. Deliberately neutral: it belongs to the showcase, not
 * to any portal.
 */

const PREREQUISITES = [
  {
    name: 'PID credential',
    detail: 'Signs you in as the learner',
    href: 'https://igrant.io/demo/pid.html',
  },
  {
    name: 'TS12 payment credential',
    detail: 'Pays the diploma fee',
    href: 'https://igrant.io/demo/ts12-payment-credential-issuance.html',
  },
];

const WHO_SIGNS_IN: Record<string, string> = {
  education: 'Learner · wallet sign-in',
  school: 'School officer · password',
  civicworks: 'Public · no sign-in',
};

/** The brand colour of the portal a step happens in, for its number chip. */
function stepColour(href: string): string {
  const portal = Object.values(PORTALS).find((p) =>
    href.startsWith(`/${p.id}`)
  );
  return portal?.brand.brand ?? '#1c2130';
}

function PortalRow({
  portal,
  activeId,
  onNavigate,
}: {
  portal: PortalConfig;
  activeId?: string;
  onNavigate: () => void;
}) {
  const active = activeId === portal.id;
  return (
    <Link
      href={portal.homePath}
      className="guide-portal"
      data-active={active}
      onClick={onNavigate}
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
      {active ? (
        <span className="guide-current">You are here</span>
      ) : (
        <ArrowRight size={15} className="guide-portal-go" aria-hidden="true" />
      )}
    </Link>
  );
}

export function ShowcaseGuide() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const current = Object.values(PORTALS).find(
    (portal) =>
      pathname === `/${portal.id}` || pathname.startsWith(`/${portal.id}/`)
  );
  const close = () => setOpen(false);

  return (
    <div className="guide">
      {open ? (
        <Drawer title="Demo guide" width={560} onClose={close}>
          <section className="guide-section">
            <h3 className="guide-heading">
              <span className="guide-heading-n">1</span> Before you start
            </h3>
            <p className="guide-lede">
              Load these two credentials into one EUDI Wallet on your phone.
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

          <section className="guide-section">
            <h3 className="guide-heading">
              <span className="guide-heading-n">2</span> The portals
            </h3>
            <p className="guide-lede">
              Three organisations, one journey. Sessions persist per portal,
              so you can switch freely.
            </p>
            <div className="guide-portals">
              <Link
                href="/"
                className="guide-portal"
                data-active={pathname === '/'}
                onClick={close}
              >
                <span className="guide-portal-mark" style={{ background: '#eef1f6' }}>
                  <BookOpen size={16} aria-hidden="true" />
                </span>
                <span className="guide-portal-text">
                  <strong>Showcase landing</strong>
                  <small>Demo script and journey map</small>
                </span>
                {pathname === '/' ? (
                  <span className="guide-current">You are here</span>
                ) : (
                  <ArrowRight size={15} className="guide-portal-go" aria-hidden="true" />
                )}
              </Link>
              {Object.values(PORTALS).map((portal) => (
                <PortalRow
                  key={portal.id}
                  portal={portal}
                  activeId={current?.id}
                  onNavigate={close}
                />
              ))}
            </div>
          </section>

          <section className="guide-section">
            <h3 className="guide-heading">
              <span className="guide-heading-n">3</span> The walkthrough
            </h3>
            <p className="guide-lede">
              Five steps, about 12 minutes. The pulsing highlight on each
              screen marks the next thing to click.
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
                      onClick={close}
                      style={{ color: stepColour(step.href) }}
                    >
                      {step.linkText} <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </Drawer>
      ) : null}
      <button
        type="button"
        className="guide-fab"
        onClick={() => setOpen(true)}
        aria-label="Open the demo guide"
      >
        <BookOpen size={16} />
        Demo guide
      </button>
    </div>
  );
}
