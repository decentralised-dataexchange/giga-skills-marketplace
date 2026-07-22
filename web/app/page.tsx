"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { api, timeAgo } from "@/lib/client";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/markdown";
import { AgentsStrip } from "@/components/agent-logo";
import { OfficialBadge } from "@/components/official-badge";
import { Pagination } from "@/components/pagination";
import { providerPath, usecaseEntryPath, usecasePath } from "@/lib/routes";

interface Entry {
  slug: string;
  type: "skill" | "usecase";
  description: string;
  version: string;
  official: boolean;
  protocols: string[];
  journeyCount: number;
  usesSkills: string[];
  publishedAt: string | null;
  org: { name: string; slug: string | null };
}

interface Provider {
  id: string;
  slug: string | null;
  name: string;
  logo: string | null;
  website: string | null;
  description: string;
  skillCount: number;
  usecaseCount: number;
}

const TABS = [
  { id: "provider", label: "Providers" },
  { id: "usecase", label: "Use cases" },
] as const;

type Tab = (typeof TABS)[number]["id"];

const INFO = [
  {
    title: "What is a provider?",
    body: "A reviewed wallet solution organisation that publishes skills - its OpenAPI specs, credential schemas, protocol flows, and integration rulebooks - so any AI coding agent can wire up its wallet.",
    href: "/login",
    cta: "Become a provider",
  },
  {
    title: "What is a use case?",
    body: "A journey-tagged prompt chain (J1, J2, …) that composes published skills into a working solution. It lists prerequisites and, per journey, the agent prompts and done-criteria. Install it into your own agent.",
    href: "/showcase",
    cta: "See what people built",
  },
  {
    title: "How submissions are reviewed",
    body: "Every skill and use case passes automated checks then a human reviewer before publication; skills can be endorsed Official. AI output stays a hypothesis until validated.",
    href: "/login",
    cta: "Governance",
  },
];

const HOW = [
  {
    title: "Providers publish",
    body: "Wallet solution providers publish reviewed skill bundles (OpenAPI specs, credential schemas and rulebooks) and compose them into use cases.",
  },
  {
    title: "You install",
    body: "Install a provider's skills or a use case into your own AI coding agent: Claude Code, Codex, opencode, or Pi.",
  },
  {
    title: "Your agent builds",
    body: "The agent wires up a working National Learner Registry and digital-credential solution. No vendor, model, or tool lock-in.",
  },
];

function monogram(text: string) {
  return text
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase();
}

const PAGE_SIZE = 8;

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>("provider");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ skills: Entry[]; total: number }>({ skills: [], total: 0 });
  const [providers, setProviders] = useState<{ providers: Provider[]; total: number }>({
    providers: [],
    total: 0,
  });

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (q.trim()) params.set("q", q.trim());
    if (tab === "provider") {
      api(`/api/providers?${params.toString()}`)
        .then((d) => setProviders({ providers: d.providers, total: d.total ?? d.providers.length }))
        .catch(console.error);
    } else {
      params.set("type", "usecase");
      api(`/api/marketplace?${params.toString()}`)
        .then((d) => setData({ skills: d.skills, total: d.total ?? d.skills.length }))
        .catch(console.error);
    }
  }, [tab, q, page]);

  function switchTab(next: Tab) {
    setTab(next);
    setPage(1);
    setQ("");
  }

  const total = tab === "provider" ? providers.total : data.total;
  const noun = tab === "provider" ? "provider" : "use case";

  return (
    <main className="w-full">
      {/* Hero */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid w-full max-w-[1536px] items-center gap-x-12 gap-y-10 px-5 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 xl:gap-x-16 xl:py-20">
          <div className="max-w-xl">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Skills &amp; use cases for AI-built DPI
            </h1>
            <p className="mt-5 text-pretty text-lg text-ink/80">
              Providers publish reviewed, agent-agnostic <b>skills</b> and <b>use cases</b> for the
              education wallet building block. Anyone installs them into their own AI coding agent
              to build a working National Learner Registry and digital-credential solution.
            </p>
            <p className="mt-3 text-pretty text-ink/70">
              Built on W3C Verifiable Credentials, SD-JWT VC, OpenID4VCI / OpenID4VP, and the
              GovStack Wallet BB. Part of the ITU / UNICEF Giga initiative. No vendor, model, or
              tool lock-in.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#catalog"
                className="rounded-[10px] bg-brand px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-brand-dark"
              >
                Browse providers
              </a>
              <Link
                href="/login"
                className="rounded-[10px] border-2 border-brand bg-white px-6 py-3 text-base font-semibold text-brand transition-colors hover:bg-accent"
              >
                Publish
              </Link>
            </div>
            <AgentsStrip label="Works with" className="mt-8" />
          </div>

          {/* Right: how it works, fills the hero at laptop widths and up */}
          <div className="w-full rounded-2xl border border-brand/20 bg-gradient-to-br from-cyan-tint to-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">How it works</p>
            <ol className="mt-5 space-y-5">
              {HOW.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{step.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink/70">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Info cards */}
      <section className="mx-auto w-full max-w-[1536px] px-5 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {INFO.map((c) => (
            <div
              key={c.title}
              className="flex flex-col rounded-xl border border-brand/25 bg-white p-6"
            >
              <h3 className="text-lg font-bold text-brand">{c.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/70">{c.body}</p>
              <a
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
              >
                {c.cta}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="mx-auto w-full max-w-[1536px] px-5 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Catalog</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {total} {noun}
              {total === 1 ? "" : "s"}
              {tab === "provider" ? "" : " published · newest first"}
            </p>
          </div>
          <Input
            type="search"
            aria-label={`Search ${noun}s`}
            className="max-w-xs border-input bg-white"
            placeholder={`Search ${noun}s…`}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Catalog type"
          className="mb-5 flex gap-1 border-b border-border"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => switchTab(t.id)}
              className={
                "-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors " +
                (tab === t.id
                  ? "border-brand text-ink"
                  : "border-transparent text-muted-foreground hover:text-ink")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Providers */}
        {tab === "provider" ? (
          <>
            <div className="space-y-4">
              {providers.providers.map((p) => (
                <Link
                  key={p.id}
                  href={providerPath(p.slug ?? p.id)}
                  className="group flex flex-col gap-4 rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center"
                >
                  {p.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.logo}
                      alt=""
                      className="size-14 shrink-0 rounded-xl object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-cyan-tint font-bold tracking-tight text-brand ring-1 ring-brand/15">
                      {monogram(p.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-ink group-hover:text-brand">{p.name}</span>
                    <Markdown className="mt-1 text-sm text-ink/70 [&_p]:m-0 [&_p]:line-clamp-2">
                      {p.description}
                    </Markdown>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-ink/70">
                        {p.skillCount} skill{p.skillCount === 1 ? "" : "s"}
                      </span>
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-ink/70">
                        {p.usecaseCount} use case{p.usecaseCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end border-t border-border pt-3 sm:w-40 sm:border-t-0 sm:pt-0">
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors group-hover:bg-brand-dark">
                      View provider
                      <ArrowRight
                        className="size-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              ))}
              {!providers.providers.length && (
                <p className="rounded-xl border border-dashed border-border bg-white py-16 text-center text-sm text-muted-foreground">
                  No providers match your search.
                </p>
              )}
            </div>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={providers.total}
              onPage={setPage}
              className="mt-6"
            />
          </>
        ) : (
          <>
            <div className="space-y-4">
              {data.skills.map((s) => (
                <Link
                  key={s.slug}
                  href={s.org.slug ? usecasePath(s.org.slug, s.slug) : usecaseEntryPath(s.slug)}
                  className="group flex flex-col gap-4 rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center"
                >
                  <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-cyan-tint font-bold tracking-tight text-brand ring-1 ring-brand/15">
                    {monogram(s.slug)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-ink group-hover:text-brand">{s.slug}</span>
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                        Use case
                      </span>
                      <OfficialBadge official={s.official} />
                    </div>
                    <Markdown className="mt-1 text-sm text-ink/70 [&_p]:m-0 [&_p]:line-clamp-2">
                      {s.description}
                    </Markdown>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-ink/70">
                        {s.journeyCount} journeys
                      </span>
                      {s.usesSkills.slice(0, 3).map((u) => (
                        <span
                          key={u}
                          className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-ink/70"
                        >
                          {u}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border pt-3 sm:w-52 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                    <div className="min-w-0 text-xs text-muted-foreground sm:text-right">
                      <div className="truncate font-medium text-ink/70">{s.org.name}</div>
                      <div>{timeAgo(s.publishedAt)}</div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors group-hover:bg-brand-dark">
                      View use case
                      <ArrowRight
                        className="size-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              ))}
              {!data.skills.length && (
                <p className="rounded-xl border border-dashed border-border bg-white py-16 text-center text-sm text-muted-foreground">
                  No use cases match your search.
                </p>
              )}
            </div>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data.total}
              onPage={setPage}
              className="mt-6"
            />
          </>
        )}
      </section>
    </main>
  );
}
