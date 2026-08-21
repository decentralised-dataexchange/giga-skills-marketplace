"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";

import { Drawer } from "@/components/drawer";
import { getNextStop, type NextStop } from "@/lib/showcase/next-stop";
import { useShowcaseStore } from "@/lib/showcase/use-store";
import { DEMO_STEPS, PREREQUISITES, WHO_SIGNS_IN, stepColour } from "@/lib/showcase/demo-steps";
import { PORTALS, type PortalConfig } from "@/lib/showcase/portals";

/**
 * The showcase overlay on every /showcase page: one floating button that
 * opens a wide drawer with the prerequisites, the portal switcher and the
 * walkthrough, so the demo can move between the organisations and always
 * see the next step. Deliberately neutral: it belongs to the showcase, not
 * to any portal. The next stop derives from the browser's own demo state.
 */

function PortalRow({
  portal,
  activeId,
  isNext,
  onNavigate,
}: {
  portal: PortalConfig;
  activeId?: string;
  isNext: boolean;
  onNavigate: () => void;
}) {
  const active = activeId === portal.id;
  return (
    <Link
      href={portal.publicPath}
      className="guide-portal"
      data-active={active}
      onClick={onNavigate}
    >
      <span className="guide-portal-mark" style={{ background: portal.brand["brand-soft"] }}>
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
      ) : isNext ? (
        <span className="guide-next-chip">Next step</span>
      ) : (
        <ArrowRight size={15} className="guide-portal-go" aria-hidden="true" />
      )}
    </Link>
  );
}

export function ShowcaseGuide() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const state = useShowcaseStore();
  const nextStop = state.hydrated ? getNextStop(state) : null;

  const current = Object.values(PORTALS).find(
    (portal) =>
      pathname === `/showcase/${portal.id}` || pathname.startsWith(`/showcase/${portal.id}/`),
  );
  const close = () => setOpen(false);

  // A callout over the demo-guide button that names the exact next step. It
  // fires only when an action moves the journey on - not on a plain page
  // load - so the demo user is nudged the moment there is a fresh thing to do.
  const [hint, setHint] = useState<NextStop | null>(null);
  const [seenHref, setSeenHref] = useState<string | null | undefined>(undefined);
  const nextHref = nextStop?.href ?? null;

  // Adjust state during render (React's "store info from a previous render"
  // pattern): the first hydrated pass sets a silent baseline, and any later
  // change to the next step raises the callout with that step's instruction.
  if (state.hydrated && nextHref !== seenHref) {
    if (seenHref !== undefined) setHint(nextStop);
    setSeenHref(nextHref);
  }

  // The callout is a nudge, not a modal: it retires itself after a while.
  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(null), 9000);
    return () => clearTimeout(timer);
  }, [hint]);

  return (
    <div className="guide">
      {open ? (
        <Drawer title="Demo guide" width={560} onClose={close}>
          <section className="guide-section">
            <h3 className="guide-heading">
              <span className="guide-heading-n">1</span> Before you start
            </h3>
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

          <section className="guide-section">
            <h3 className="guide-heading">
              <span className="guide-heading-n">2</span> The portals
            </h3>
            <p className="guide-lede">
              Three organisations, one journey. Sessions persist per portal in this browser, so you
              can switch freely.
            </p>
            <div className="guide-portals">
              <Link
                href="/showcase"
                className="guide-portal"
                data-active={pathname === "/showcase"}
                onClick={close}
              >
                <span className="guide-portal-mark" style={{ background: "#eef1f6" }}>
                  <BookOpen size={16} aria-hidden="true" />
                </span>
                <span className="guide-portal-text">
                  <strong>Showcase landing</strong>
                  <small>Demo script and journey map</small>
                </span>
                {pathname === "/showcase" ? (
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
                  isNext={nextStop?.portalId === portal.id}
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
              Five steps, about 12 minutes. The pulsing highlight on each screen marks the next
              thing to click.
            </p>
            <ol className="guide-steps">
              {DEMO_STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="guide-step-n" style={{ background: stepColour(step.href) }}>
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
      {hint && !open ? (
        <div
          className="guide-hint"
          role="status"
          style={{ "--hint-accent": stepColour(hint.href) } as CSSProperties}
        >
          <button
            type="button"
            className="guide-hint-x"
            onClick={() => setHint(null)}
            aria-label="Dismiss the next-step hint"
          >
            ×
          </button>
          <span className="guide-hint-kicker">Next step</span>
          <Link className="guide-hint-link" href={hint.href} onClick={() => setHint(null)}>
            {hint.label}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      ) : null}
      <button
        type="button"
        className="guide-fab"
        onClick={() => {
          setHint(null);
          setOpen(true);
        }}
        aria-label="Open the demo guide"
      >
        <BookOpen size={16} />
        Demo guide
      </button>
    </div>
  );
}
