'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, X } from 'lucide-react';

import { PORTALS } from '@/lib/portals';

/**
 * The showcase overlay: a floating switcher on every portal so the demo can
 * jump between the five organisations without typing URLs. Deliberately
 * neutral (it belongs to the showcase, not to any portal identity).
 */
export function PortalSwitcher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const current = Object.values(PORTALS).find(
    (portal) =>
      pathname === `/${portal.id}` || pathname.startsWith(`/${portal.id}/`)
  );

  return (
    <div className="switcher">
      {open ? (
        <div className="switcher-panel">
          <div className="switcher-head">
            <span>Showcase portals</span>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X size={15} />
            </button>
          </div>
          <Link
            href="/"
            className="switcher-item"
            data-active={pathname === '/'}
            onClick={() => setOpen(false)}
          >
            <span className="switcher-dot" style={{ background: '#1c2130' }} />
            <span>
              <strong>Showcase landing</strong>
              <small>Demo script and journey map</small>
            </span>
          </Link>
          {Object.values(PORTALS).map((portal) => (
            <Link
              key={portal.id}
              href={portal.id === 'education' ? '/education' : portal.homePath}
              className="switcher-item"
              data-active={current?.id === portal.id}
              onClick={() => setOpen(false)}
            >
              <span
                className="switcher-dot"
                style={{ background: portal.brand.brand }}
              />
              <span>
                <strong>{portal.name}</strong>
                <small>{portal.organisation}</small>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="switcher-fab"
        onClick={() => setOpen((value) => !value)}
        aria-label="Switch portal"
      >
        <Compass size={16} />
        {current ? current.organisation : 'Showcase'}
      </button>
    </div>
  );
}
