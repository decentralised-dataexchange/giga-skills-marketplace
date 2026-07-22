"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Blocks, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { api, timeAgo } from "@/lib/client";
import { Markdown } from "@/components/markdown";
import { OfficialBadge } from "@/components/official-badge";
import { StandardPill } from "@/components/standard-pill";
import { skillPath } from "@/lib/routes";

interface Provider {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  website: string | null;
  description: string;
  skillCount: number;
  usecaseCount: number;
}

interface SkillEntry {
  slug: string;
  official: boolean;
  description: string;
  protocols: string[];
  publishedAt: string | null;
}

function monogram(name: string) {
  return name
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProviderPage() {
  // The path segment is the provider's slug; its UUID also resolves.
  const { provider: handle } = useParams<{ provider: string }>();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));

  useEffect(() => {
    api(`/api/providers/${encodeURIComponent(handle)}`)
      .then(setProvider)
      .catch((e) => setError(e.message));
    api(`/api/marketplace?type=skill&provider=${encodeURIComponent(handle)}&pageSize=48`)
      .then((d) => setSkills(d.skills))
      .catch(() => setSkills([]));
  }, [handle]);

  const command = provider?.slug ? `npx skills add ${origin}/${provider.slug}` : "";

  function copyInstall() {
    if (!command) return;
    navigator.clipboard?.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (error)
    return (
      <main className="mx-auto max-w-[1536px] px-5 py-10 text-muted-foreground sm:px-6 lg:px-8">
        {error}
      </main>
    );
  if (!provider)
    return (
      <main className="mx-auto max-w-[1536px] px-5 py-10 text-muted-foreground sm:px-6 lg:px-8">
        Loading...
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-[1536px] px-5 pb-20 pt-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Providers
      </Link>

      {/* Header */}
      <div className="mt-3 border-b border-border pb-6">
        <div className="flex flex-wrap items-start gap-4">
          {provider.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={provider.logo}
              alt=""
              className="size-16 shrink-0 rounded-2xl object-cover ring-1 ring-border"
            />
          ) : (
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-cyan-tint text-xl font-bold tracking-tight text-brand ring-1 ring-brand/15">
              {monogram(provider.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
              Provider
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{provider.name}</h1>
            {provider.slug && (
              <p className="mt-1 font-mono text-sm text-muted-foreground">/{provider.slug}</p>
            )}
            <Markdown className="mt-2 max-w-3xl text-muted-foreground">
              {provider.description}
            </Markdown>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="font-medium text-ink/70">
                {provider.skillCount} skill{provider.skillCount === 1 ? "" : "s"}
              </span>
              <span>
                {provider.usecaseCount} use case{provider.usecaseCount === 1 ? "" : "s"}
              </span>
              {provider.website && (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                >
                  Website <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={copyInstall}
            disabled={!command || !skills.length}
            className="inline-flex shrink-0 items-center gap-2 rounded-[10px] bg-brand px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy className="size-4" aria-hidden="true" />
            {copied ? "Copied" : "Install all skills"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Skills */}
        <div className="min-w-0 space-y-4">
          <h2 className="text-lg font-bold text-ink">
            Skills{" "}
            <span className="tabular-nums text-muted-foreground">({provider.skillCount})</span>
          </h2>
          {skills.map((s) => (
            <Link
              key={s.slug}
              href={skillPath(provider.slug ?? handle, s.slug)}
              className="group flex flex-col gap-4 rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-cyan-tint font-bold tracking-tight text-brand ring-1 ring-brand/15">
                {monogram(s.slug)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-ink group-hover:text-brand">{s.slug}</span>
                  <OfficialBadge official={s.official} />
                </div>
                <Markdown className="mt-1 text-sm text-ink/70 [&_p]:m-0 [&_p]:line-clamp-2">
                  {s.description}
                </Markdown>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {s.protocols.slice(0, 4).map((p) => (
                    <StandardPill
                      key={p}
                      code={p}
                      className="rounded bg-secondary px-2 py-0.5 text-ink/70"
                    />
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:justify-end">
                {timeAgo(s.publishedAt)}
                <ChevronRight
                  className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
          {!skills.length && (
            <p className="rounded-xl border border-dashed border-border bg-white py-16 text-center text-sm text-muted-foreground">
              This provider has no published skills yet.
            </p>
          )}
        </div>

        {/* Install instructions */}
        <aside className="min-w-0">
          <div className="rounded-xl border border-brand/30 bg-white p-6 lg:sticky lg:top-6">
            <div className="flex items-center gap-2">
              <Blocks className="size-5 text-brand" aria-hidden="true" />
              <h2 className="text-lg font-bold text-ink">Install instructions</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Run this in your AI coding agent to install every skill from {provider.name}.
            </p>
            {command ? (
              <>
                <div className="mt-4 flex items-center gap-2 overflow-x-auto rounded-lg border border-border bg-muted p-3">
                  <code className="whitespace-nowrap font-mono text-sm text-ink">{command}</code>
                </div>
                <button
                  type="button"
                  onClick={copyInstall}
                  className="mt-3 inline-flex items-center gap-2 rounded-[10px] border-2 border-brand bg-white px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-accent"
                >
                  <Copy className="size-4" aria-hidden="true" />
                  {copied ? "Copied" : "Copy command"}
                </button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Installs all of this provider&apos;s published skills via agent-skills discovery (
                  <code className="font-mono">/.well-known/skills/index.json</code>). Works with the{" "}
                  <a
                    href="https://github.com/vercel-labs/skills"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand hover:underline"
                  >
                    skills
                  </a>{" "}
                  CLI.
                </p>
              </>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-border bg-muted py-8 text-center text-sm text-muted-foreground">
                No skills to install yet.
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
