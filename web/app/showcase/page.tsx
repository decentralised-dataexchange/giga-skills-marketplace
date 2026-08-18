import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import { DEMO_STEPS, PREREQUISITES, WHO_SIGNS_IN, stepColour } from "@/lib/showcase/demo-steps";
import { PORTALS } from "@/lib/showcase/portals";

/**
 * The showcase landing page, in the marketplace's own visual language: it
 * shares the site navbar, hero idiom and design tokens. This is the only
 * screen that admits to being a demo: prerequisites, the portals, and
 * step-by-step instructions to try the whole journey. Each portal then
 * presents itself as its own product.
 */

export default function ShowcaseLanding() {
  return (
    <main className="w-full">
      <section className="border-b border-panel-border">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 xl:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">
              ITU / Giga education use case showcase
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              National Learner Registry &amp; Education Wallet
            </h1>
            <p className="mt-5 max-w-[920px] text-pretty text-lg leading-relaxed text-[#374151]">
              One demonstration, three portals. A learner registers with a PID from a Wallet,
              receives a Student ID and a diploma as verifiable credentials, confirms payment with a
              payment credential, and applies for a job with selective disclosure. Enrolment,
              issuance and revocation are processed automatically by the National Learner Registry;
              every step lands in its audit trail. Revocation closes the loop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/showcase/education"
                className="rounded-lg bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                Start the walkthrough
              </Link>
              <Link
                href="#walkthrough"
                className="rounded-lg border border-[#dadde1] bg-white px-6 py-3 text-base font-semibold text-brand transition-colors hover:border-brand hover:bg-brand hover:text-white"
              >
                Read the steps first
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-panel-border">
        <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-ink">
            <span className="grid size-7 place-items-center rounded-full border-2 border-ink text-xs">
              1
            </span>
            Before you start
          </h2>
          <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
            Download a Wallet app on your phone, then load these two credentials into it.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {PREREQUISITES.map((item) => (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 rounded-lg border border-panel-border bg-white p-4 transition-colors hover:border-brand"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink group-hover:text-brand">
                    {item.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span>
                </span>
                <ExternalLink
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-panel-border">
        <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-ink">
            <span className="grid size-7 place-items-center rounded-full border-2 border-ink text-xs">
              2
            </span>
            The portals
          </h2>
          <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
            Three organisations, one journey. Sessions persist per portal in this browser, so you
            can switch freely.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {Object.values(PORTALS).map((portal) => (
              <Link
                key={portal.id}
                href={portal.publicPath}
                className="group flex items-start gap-3 rounded-lg border border-panel-border bg-white p-4 transition-colors hover:border-brand"
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-lg"
                  style={{ background: portal.brand["brand-soft"] }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={portal.logo} alt="" className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink group-hover:text-brand">
                    {portal.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {portal.organisation} · {WHO_SIGNS_IN[portal.id]}
                  </span>
                </span>
                <ArrowRight
                  className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="walkthrough">
        <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-ink">
            <span className="grid size-7 place-items-center rounded-full border-2 border-ink text-xs">
              3
            </span>
            The walkthrough
          </h2>
          <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
            Five steps, about 12 minutes. Follow them in order; every sign-in form is prefilled with
            its demo account, and the pulsing highlight on each screen marks the next thing to
            click.
          </p>
          <ol className="mt-6 max-w-[860px] list-none">
            {DEMO_STEPS.map((step, index) => (
              <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
                {index < DEMO_STEPS.length - 1 ? (
                  <span
                    className="absolute bottom-1 left-[15px] top-9 w-0.5 bg-panel-border"
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                  style={{ background: stepColour(step.href) }}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 pt-1">
                  <span className="block text-base font-semibold text-ink">{step.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-[#4b5563]">
                    {step.text}
                  </span>
                  <Link
                    href={step.href}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                    style={{ color: stepColour(step.href) }}
                  >
                    {step.linkText} <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-10 border-t border-panel-border pt-6 text-sm text-muted-foreground">
            Every person, institution and identifier in this showcase is fictional. All demo state
            lives in this browser: your walkthrough is yours alone, and deleting the demo account
            clears it.
          </p>
        </div>
      </section>
    </main>
  );
}
