"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, Star } from "@/components/icons";
import { api, fetchAllProviderSkills } from "@/lib/client";
import { Markdown } from "@/components/markdown";
import { sourcePath } from "@/lib/routes";

interface Provider {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  website: string | null;
  description: string;
  skillCount: number;
}

interface SkillEntry {
  slug: string;
  description: string;
  protocols: string[];
  publishedAt: string | null;
  source: { repo: string | null } | null;
  repo: {
    url: string;
    owner: string;
    repo: string;
    dir: string;
    stars: number;
  } | null;
}

interface Source {
  key: string;
  repo: SkillEntry["repo"];
  skills: SkillEntry[];
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

  useEffect(() => {
    api(`/api/providers/${encodeURIComponent(handle)}`)
      .then(setProvider)
      .catch((e) => setError(e.message));
    fetchAllProviderSkills(handle)
      .then(setSkills)
      .catch(() => setSkills([]));
  }, [handle]);

  // Skills grouped into sources, as on a skills.sh owner page: one entry per
  // GitHub repository, sorted by stars; bundle-sourced skills fall under one
  // "bundles" pseudo-source.
  const sources: Source[] = [
    ...skills
      .reduce((m, s) => {
        const key = s.source?.repo ?? s.repo?.repo ?? "bundles";
        const g = m.get(key) ?? { key, repo: s.repo, skills: [] };
        g.skills.push(s);
        return m.set(key, g);
      }, new Map<string, Source>())
      .values(),
  ].sort((a, b) => (b.repo?.stars ?? -1) - (a.repo?.stars ?? -1));

  if (error)
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-muted-foreground sm:px-6 lg:px-8">
        {error}
      </main>
    );
  if (!provider)
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-muted-foreground sm:px-6 lg:px-8">
        Loading...
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground"
      >
        <Link href="/" className="shrink-0 hover:text-ink">
          marketplace
        </Link>
        <span className="shrink-0" aria-hidden="true">
          /
        </span>
        <span className="min-w-0 truncate">{provider.slug ?? handle}</span>
      </nav>

      {/* Header: title, stats, description */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-4">
          {provider.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={provider.logo}
              alt=""
              className="size-12 shrink-0 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-cyan-tint text-lg font-bold tracking-tight text-brand ring-1 ring-brand/15">
              {monogram(provider.name)}
            </div>
          )}
          <h1 className="text-4xl font-semibold tracking-tight text-ink">{provider.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink">
          <span className="whitespace-nowrap">
            <b className="tabular-nums">{sources.length || 1}</b> source
            {sources.length === 1 ? "" : "s"}
          </span>
          <span className="whitespace-nowrap">
            <b className="tabular-nums">{provider.skillCount}</b> skill
            {provider.skillCount === 1 ? "" : "s"}
          </span>
          {provider.website && (
            <a
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-brand hover:underline"
            >
              Website <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </div>

        <Markdown className="mt-4 text-muted-foreground">{provider.description}</Markdown>
      </div>

      {/* Flat source table, as on a skills.sh owner page */}
      <div className="w-full py-4">
        <div className="hidden border-b border-border py-3 text-sm font-medium uppercase text-muted-foreground lg:grid lg:grid-cols-16 lg:gap-4">
          <div className="col-span-13">Source</div>
          <div className="col-span-3 text-right">Stars</div>
        </div>
        <div className="divide-y divide-border">
          {sources.map((g) => {
            const names = g.skills.map((s) => s.slug);
            const preview = names.slice(0, 3).join(", ");
            const more = names.length - Math.min(3, names.length);
            return (
              <Link
                key={g.key}
                href={sourcePath(provider.slug ?? handle, g.key)}
                className="group grid grid-cols-[1fr_auto] items-start gap-3 py-3 transition-colors hover:bg-accent/30 lg:grid-cols-16 lg:gap-4"
              >
                <span className="min-w-0 overflow-hidden lg:col-span-13">
                  <span className="block truncate font-semibold text-ink group-hover:text-brand">
                    {g.repo ? g.repo.repo : "Marketplace bundles"}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground lg:text-sm">
                    {g.skills.length} skill{g.skills.length === 1 ? "" : "s"}: {preview}
                    {more > 0 ? ` +${more} more` : ""}
                  </span>
                </span>
                <span className="pt-0.5 text-right lg:col-span-3">
                  {g.repo ? (
                    <span className="inline-flex items-center gap-1 text-sm tabular-nums text-ink">
                      <Star className="size-3.5 text-amber-500" aria-hidden="true" />
                      {g.repo.stars}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
        {!skills.length && (
          <p className="border-b border-border py-16 text-center text-sm text-muted-foreground">
            This provider has no published skills yet.
          </p>
        )}
      </div>
    </main>
  );
}
