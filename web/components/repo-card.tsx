"use client";

// Source-repository provenance for a repo-submitted skill version: deep link
// pinned to the recorded commit, with GitHub metadata captured at submission
// time.
import { ExternalLink, GitFork, Star } from "@/components/icons";
import { Tip } from "@/components/tip";
import { fmtDate } from "@/lib/client";

export interface RepoInfo {
  url: string;
  owner: string;
  repo: string;
  dir?: string;
  ref?: string;
  commit?: string;
  stars?: number;
  forks?: number;
  pushedAt?: string | null;
  license?: string | null;
}

export function pinnedRepoLink(repo: RepoInfo): string {
  if (!repo.commit) return repo.url;
  const dir = repo.dir ? `/${repo.dir}` : "";
  return `${repo.url}/tree/${repo.commit}${dir}`;
}

export function RepoCard({ repo }: { repo: RepoInfo }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a
          href={pinnedRepoLink(repo)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-0 items-center gap-1.5 text-[15px] font-semibold text-brand hover:underline"
        >
          <span className="truncate">
            {repo.owner}/{repo.repo}
            {repo.dir ? `/${repo.dir}` : ""}
          </span>
          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
        </a>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Tip content="GitHub stars">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Star className="size-4" aria-hidden="true" />
              {repo.stars ?? 0}
            </span>
          </Tip>
          <Tip content="Forks">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <GitFork className="size-4" aria-hidden="true" />
              {repo.forks ?? 0}
            </span>
          </Tip>
        </div>
      </div>
      {/* Label-over-value columns: tidy at every width, Cal Sans values, and
          mono only for the pinned commit (the one code-like value). */}
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {repo.commit && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pinned
            </dt>
            <dd className="mt-0.5 font-mono text-xs text-ink">
              {repo.ref && repo.ref !== repo.commit ? `${repo.ref} @ ` : ""}
              {repo.commit.slice(0, 7)}
            </dd>
          </div>
        )}
        {repo.license && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Licence
            </dt>
            <dd className="mt-0.5 text-sm text-ink">{repo.license}</dd>
          </div>
        )}
        {repo.pushedAt && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Last push
            </dt>
            <dd className="mt-0.5 text-sm text-ink">{fmtDate(repo.pushedAt)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
