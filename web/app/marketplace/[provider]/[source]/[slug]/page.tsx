"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Copy, ExternalLink, Star } from "@/components/icons";
import { api, fmtDate } from "@/lib/client";
import { Markdown } from "@/components/markdown";
import { StandardPill } from "@/components/standard-pill";
import { installCommand } from "@/lib/agents";
import { cn } from "@/lib/utils";
import { providerPath, skillPath, skillReviewPath, sourcePath } from "@/lib/routes";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Collapse long SKILL.md bodies behind "Show more", as on skills.sh.
const COLLAPSE_THRESHOLD = 1200;

// Uppercase mono section header with a bottom rule, as on a skills.sh skill
// page (Installation / Summary / SKILL.md / Related skills).
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 border-b border-border pb-4 text-sm font-medium uppercase text-ink">
      {children}
    </h2>
  );
}

// One labelled block in the metadata sidebar, as the flat stacked blocks
// (Repository / GitHub Stars / First Seen …) on a skills.sh detail page.
function MetaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-5 first:pt-0">
      <dt className="mb-2 text-sm uppercase text-ink">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}

export default function SkillPage() {
  const { provider, source, slug } = useParams<{
    provider: string;
    source: string;
    slug: string;
  }>();
  const router = useRouter();
  const [detail, setDetail] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api(`/api/marketplace/${slug}`)
      .then(setDetail)
      .catch((e) => setError(e.message));
  }, [slug]);

  // Skill slugs are globally unique, so the provider and source segments are
  // claims about ownership. When either names the wrong place, move to the
  // canonical URL.
  const ownerSlug: string | null = detail?.org?.slug ?? null;
  const canonicalSource: string | null = detail ? (detail.version?.repo?.repo ?? "bundles") : null;
  useEffect(() => {
    if (!ownerSlug || !canonicalSource) return;
    if (ownerSlug !== provider || canonicalSource !== source)
      router.replace(skillPath(ownerSlug, canonicalSource, slug));
  }, [ownerSlug, canonicalSource, provider, source, slug, router]);

  // Other skills from the same provider, shown as "Related skills".
  useEffect(() => {
    if (!ownerSlug) return;
    api(`/api/marketplace?provider=${encodeURIComponent(ownerSlug)}&pageSize=12`)
      .then((d) => setRelated(d.skills.filter((s: any) => s.slug !== slug).slice(0, 5)))
      .catch(() => setRelated([]));
  }, [ownerSlug, slug]);

  if (error) return <main className="mx-auto max-w-7xl p-10 text-muted-foreground">{error}</main>;
  if (!detail)
    return <main className="mx-auto max-w-7xl p-10 text-muted-foreground">Loading...</main>;

  const { skill, org, version } = detail;
  const manifest = version.manifest ?? {};
  const files: any[] = version.files ?? [];
  const protocols: string[] = Array.isArray(manifest.targets?.protocols)
    ? manifest.targets.protocols
    : typeof manifest.metadata?.protocols === "string"
      ? manifest.metadata.protocols.split(/\s*,\s*/).filter(Boolean)
      : [];
  const skillMd = files.find((f: any) => f.path.toLowerCase() === "skill.md");
  const readme = (skillMd?.content ?? "").replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, "");
  const collapsible = readme.length > COLLAPSE_THRESHOLD;
  const license = manifest.license ?? "unlicensed";
  const checks: any[] = version.checks ?? [];
  const checksPassed = checks.filter((c: any) => c.status === "pass").length;
  const handle = org.slug ?? provider;
  const repo = version.repo ?? null;
  const srcKey = repo?.repo ?? "bundles";
  // Skills install via the skills CLI from their public GitHub repository;
  // legacy skills without one have no valid install command.
  const command = installCommand({ repoUrl: repo?.url, skillId: skill.slug });

  function copyCommand() {
    if (!command) return;
    navigator.clipboard?.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

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
        <Link href={providerPath(handle)} className="min-w-0 truncate hover:text-ink">
          {handle}
        </Link>
        <span className="shrink-0" aria-hidden="true">
          /
        </span>
        <Link href={sourcePath(handle, srcKey)} className="min-w-0 truncate hover:text-ink">
          {srcKey}
        </Link>
        <span className="shrink-0" aria-hidden="true">
          /
        </span>
        <span className="min-w-0 truncate">{skill.slug}</span>
      </nav>

      <h1 className="mb-2 text-4xl font-semibold tracking-tight text-ink">{skill.slug}</h1>

      {protocols.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {protocols.map((p) => (
            <StandardPill key={p} code={p} />
          ))}
        </div>
      )}

      {/* Two-column body, as on a skills.sh skill page */}
      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="min-w-0 overflow-hidden lg:col-span-9">
          {/* Install command */}
          {command && (
            <section>
              <SectionHeader>Installation</SectionHeader>
              <div className="flex w-full max-w-3xl items-center gap-2 rounded-md bg-muted px-3 py-2">
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-ink">
                  <span className="select-none opacity-50">$ </span>
                  {command}
                </code>
                <button
                  type="button"
                  onClick={copyCommand}
                  aria-label="Copy install command"
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-ink"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </button>
              </div>
            </section>
          )}

          {/* Summary */}
          {manifest.description && (
            <section className="mt-10">
              <SectionHeader>Summary</SectionHeader>
              <div className="rounded-lg border border-border bg-muted px-6 py-3">
                <p className="text-sm font-medium text-ink">{manifest.description}</p>
              </div>
            </section>
          )}

          {/* SKILL.md, rendered straight on the page background with a fade
              and full-width "Show more", as on skills.sh */}
          <section className="mt-10">
            <SectionHeader>SKILL.md</SectionHeader>
            <div
              className={cn(
                "relative overflow-hidden",
                collapsible && !expanded && "max-h-[420px]",
              )}
            >
              <Markdown>{readme}</Markdown>
              {collapsible && !expanded && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"
                  aria-hidden="true"
                />
              )}
            </div>
            {collapsible && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-4 w-full py-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </section>

          {/* Related skills */}
          {related.length > 0 && (
            <section className="mt-16">
              <SectionHeader>Related skills</SectionHeader>
              <p className="mb-3 text-xs uppercase text-muted-foreground">More from {org.name}</p>
              <ul className="divide-y divide-border">
                {related.map((r: any) => (
                  <li key={r.slug}>
                    <Link
                      href={skillPath(r.org?.slug ?? handle, r.repo?.repo ?? "bundles", r.slug)}
                      className="grid grid-cols-1 gap-x-4 py-3 transition-colors hover:bg-accent/30 sm:grid-cols-[1fr_auto]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink">{r.slug}</span>
                        <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {r.description}
                        </span>
                      </span>
                      {r.repo && (
                        <span className="shrink-0 text-right text-xs text-muted-foreground sm:self-center">
                          {r.repo.owner}/{r.repo.repo}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Metadata sidebar: flat stacked blocks, as on skills.sh, with this
            marketplace's assurance record in the security-audits slot. */}
        <aside className="lg:col-span-3">
          <dl>
            {repo && (
              <MetaBlock label="Repository">
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 break-all font-mono text-brand hover:underline"
                >
                  <span className="truncate">
                    {repo.owner}/{repo.repo}
                  </span>
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                </a>
              </MetaBlock>
            )}
            {repo && (
              <MetaBlock label="GitHub stars">
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Star className="size-3.5 text-amber-500" aria-hidden="true" />
                  {repo.stars}
                </span>
              </MetaBlock>
            )}
            {repo && (
              <MetaBlock label="Source">
                <Link
                  href={sourcePath(handle, repo.repo)}
                  className="font-mono text-brand hover:underline"
                >
                  {repo.dir || repo.repo}
                </Link>
              </MetaBlock>
            )}
            <MetaBlock label="First seen">
              <span className="font-mono">{fmtDate(version.publishedAt)}</span>
            </MetaBlock>
            <MetaBlock label="Licence">
              <span className="font-mono">{license}</span>
            </MetaBlock>
            <MetaBlock label="Provider">
              <Link href={providerPath(handle)} className="text-brand hover:underline">
                {org.name}
              </Link>
            </MetaBlock>
          </dl>

          {/* Assurance: this marketplace's equivalent of the audits block */}
          <div className="py-5">
            <h2 className="mb-3 text-sm uppercase text-ink">Assurance</h2>
            <div className="divide-y divide-border">
              {checks.length > 0 && (
                <div className="flex items-center justify-between gap-2 py-2">
                  <span className="truncate text-sm font-medium text-ink">Automated checks</span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-2 py-1 text-xs uppercase",
                      checksPassed === checks.length
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600",
                    )}
                  >
                    {checksPassed}/{checks.length}
                  </span>
                </div>
              )}
              <p className="py-2 text-xs text-muted-foreground">
                Automated checks plus a human review before publication.
              </p>
              <Link
                href={skillReviewPath(handle, srcKey, skill.slug)}
                className="inline-flex items-center gap-1 py-2 text-sm font-semibold text-brand hover:underline"
              >
                View review trail
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
