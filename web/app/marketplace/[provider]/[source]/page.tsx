"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Star } from "@/components/icons";
import { api, fetchAllProviderSkills, timeAgo } from "@/lib/client";
import { installRepoCommand } from "@/lib/agents";
import { providerPath, skillPath } from "@/lib/routes";

interface Provider {
  id: string;
  name: string;
  slug: string | null;
  skillCount: number;
}

interface SkillEntry {
  slug: string;
  description: string;
  publishedAt: string | null;
  repo: {
    url: string;
    owner: string;
    repo: string;
    dir: string;
    stars: number;
  } | null;
}

// One source of a provider: a GitHub repository (addressed by repo name), or
// the "bundles" pseudo-source for skills published without a repository.
export default function SourcePage() {
  const { provider: handle, source } = useParams<{
    provider: string;
    source: string;
  }>();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [skills, setSkills] = useState<SkillEntry[] | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api(`/api/providers/${encodeURIComponent(handle)}`)
      .then(setProvider)
      .catch((e) => setError(e.message));
    fetchAllProviderSkills(handle)
      .then((all) =>
        setSkills(
          all.filter((s: SkillEntry) => (source === "bundles" ? !s.repo : s.repo?.repo === source)),
        ),
      )
      .catch(() => setSkills([]));
  }, [handle, source]);

  const repo = skills?.find((s) => s.repo)?.repo ?? null;
  const command = repo ? installRepoCommand(repo.url) : "";

  // Section skills by the top-level directory they live under in the repo.
  const categories = [
    ...(skills ?? []).reduce((m, s) => {
      const dir = s.repo?.dir ?? "";
      const key = dir.includes("/") ? dir.split("/")[0] : "skills";
      return m.set(key, [...(m.get(key) ?? []), s]);
    }, new Map<string, SkillEntry[]>()),
  ].sort(([, a], [, b]) => b.length - a.length);

  function copyInstall() {
    if (!command) return;
    navigator.clipboard?.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (error)
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-muted-foreground sm:px-6 lg:px-8">
        {error}
      </main>
    );
  if (!provider || skills === null)
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
        <Link
          href={providerPath(provider.slug ?? handle)}
          className="min-w-0 truncate hover:text-ink"
        >
          {provider.slug ?? handle}
        </Link>
        <span className="shrink-0" aria-hidden="true">
          /
        </span>
        <span className="min-w-0 truncate">{source}</span>
      </nav>

      {/* Header: title and stats */}
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-semibold tracking-tight text-ink">
          {repo ? `${repo.owner}/${repo.repo}` : "Marketplace bundles"}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink">
          <span className="whitespace-nowrap">
            <b className="tabular-nums">{skills.length}</b> skill
            {skills.length === 1 ? "" : "s"}
          </span>
          {repo && (
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Star className="size-4 text-amber-500" aria-hidden="true" />
              <b className="tabular-nums">{repo.stars}</b> GitHub stars
            </span>
          )}
          {repo && (
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-brand hover:underline"
            >
              GitHub <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {/* Install command for every skill in this source, as the flat muted
          command block at the top of a skills.sh repository page */}
      {command && skills.length > 0 && (
        <div className="mb-10 flex w-full max-w-3xl items-center gap-2 rounded-md bg-muted px-3 py-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-ink">
            <span className="select-none opacity-50">$ </span>
            {command}
          </code>
          <button
            type="button"
            onClick={copyInstall}
            aria-label="Copy install command"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-ink"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>
      )}

      {/* Skill table, sectioned by top-level repo directory (as skills.sh
          sections a repository's skills by category) */}
      <div className="w-full py-4">
        <div className="hidden border-b border-border py-3 text-sm font-medium uppercase text-muted-foreground lg:grid lg:grid-cols-16 lg:gap-4">
          <div className="col-span-13">Skill</div>
          <div className="col-span-3 text-right">Published</div>
        </div>
        <div className="space-y-10">
          {categories.map(([category, group]) => (
            <section key={category}>
              {categories.length > 1 && (
                <h2 className="mb-3 mt-6 text-sm font-medium uppercase text-ink">{category}</h2>
              )}
              <div className="divide-y divide-border">
                {group.map((s) => (
                  <Link
                    key={s.slug}
                    href={skillPath(provider.slug ?? handle, source, s.slug)}
                    className="group grid grid-cols-[1fr_auto] items-start gap-3 py-3 transition-colors hover:bg-accent/30 lg:grid-cols-16 lg:gap-4"
                  >
                    <span className="min-w-0 overflow-hidden lg:col-span-13">
                      <span className="block truncate font-semibold text-ink group-hover:text-brand">
                        {s.slug}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground lg:text-sm">
                        {s.description}
                      </span>
                    </span>
                    <span className="pt-0.5 text-right text-sm text-muted-foreground lg:col-span-3">
                      {timeAgo(s.publishedAt)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
        {!skills.length && (
          <p className="border-b border-border py-16 text-center text-sm text-muted-foreground">
            No skills in this source.
          </p>
        )}
      </div>
    </main>
  );
}
