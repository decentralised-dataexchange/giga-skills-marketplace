'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen } from 'lucide-react';

import { Drawer } from '@/components/Drawer';
import { DEMO_STEPS } from '@/lib/demo-steps';
import { PORTALS } from '@/lib/portals';

/**
 * The showcase overlay on every portal: one floating button that opens a
 * wide drawer with the portal switcher and the try-it-out instructions, so
 * the demo can move between the organisations and always see the next step.
 * Deliberately neutral: it belongs to the showcase, not to any portal.
 */
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
          <h3 className="guide-heading">Portals</h3>
          <div className="guide-portals">
            <Link
              href="/"
              className="guide-portal"
              data-active={pathname === '/'}
              onClick={close}
            >
              <span className="guide-dot" style={{ background: '#1c2130' }} />
              <span className="guide-portal-text">
                <strong>Showcase landing</strong>
                <small>Demo script and journey map</small>
              </span>
              {pathname === '/' ? (
                <span className="guide-current">You are here</span>
              ) : null}
            </Link>
            {Object.values(PORTALS).map((portal) => (
              <Link
                key={portal.id}
                href={portal.homePath}
                className="guide-portal"
                data-active={current?.id === portal.id}
                onClick={close}
              >
                <span
                  className="guide-dot"
                  style={{ background: portal.brand.brand }}
                />
                <span className="guide-portal-text">
                  <strong>{portal.name}</strong>
                  <small>{portal.organisation}</small>
                </span>
                {current?.id === portal.id ? (
                  <span className="guide-current">You are here</span>
                ) : null}
              </Link>
            ))}
          </div>

          <h3 className="guide-heading">Try it out</h3>
          <ol className="guide-steps">
            {DEMO_STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="guide-step-n">{index + 1}</span>
                <span className="guide-step-body">
                  <span className="guide-step-title">{step.title}</span>
                  <span className="guide-step-text">
                    {step.text}{' '}
                    <Link href={step.href} onClick={close}>
                      {step.linkText} →
                    </Link>
                  </span>
                </span>
              </li>
            ))}
          </ol>
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
