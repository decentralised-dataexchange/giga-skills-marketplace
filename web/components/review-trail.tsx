"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { providerPath, skillPath, sourcePath } from "@/lib/routes";
import { Card } from "@/components/ui/card";
import { CheckList, type Check } from "@/components/check-list";
import { Markdown } from "@/components/markdown";

/* eslint-disable @typescript-eslint/no-explicit-any */

const NODE: Record<string, { label: string; dot: string }> = {
  "skill.submitted": { label: "Submitted for review", dot: "bg-muted-foreground" },
  "review.approve": { label: "Approved & published", dot: "bg-emerald-500" },
  "review.request_changes": { label: "Changes requested", dot: "bg-amber-500" },
  "review.reject": { label: "Rejected", dot: "bg-red-500" },
  "skill.delisted": { label: "Delisted", dot: "bg-red-500" },
};

function nodeInfo(t: any) {
  if (t.type === "skill.official_set") {
    return {
      label: t.detail?.official ? "Endorsed as Official" : "Moved to Community",
      dot: "bg-brand",
    };
  }
  return NODE[t.type] ?? { label: t.type, dot: "bg-muted-foreground" };
}

function when(iso?: string | null) {
  return iso
    ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "-";
}

// The public assurance record for one published skill. Rendered by
// the /marketplace/<provider>/<source>/<skill>/review page.
export function ReviewTrail({
  provider,
  source,
  slug,
}: {
  provider: string;
  source: string;
  slug: string;
}) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // The provider segment picks the owner: skill names are unique per
    // organisation, and several organisations may publish the same name.
    api(`/api/marketplace/${slug}/review?provider=${encodeURIComponent(provider)}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [slug, provider]);

  if (error)
    return (
      <main className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-10 text-muted-foreground">
        {error}
      </main>
    );
  if (!data)
    return (
      <main className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-10 text-muted-foreground">
        Loading...
      </main>
    );

  const { version, trail } = data;
  const checks: Check[] = version.checks ?? [];
  const passed = checks.filter((c) => c.status === "pass").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8 pb-20 pt-8">
      {/* Breadcrumb, as on the other catalog pages */}
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
        <Link href={providerPath(provider)} className="min-w-0 truncate hover:text-ink">
          {provider}
        </Link>
        <span className="shrink-0" aria-hidden="true">
          /
        </span>
        <Link href={sourcePath(provider, source)} className="min-w-0 truncate hover:text-ink">
          {source}
        </Link>
        <span className="shrink-0" aria-hidden="true">
          /
        </span>
        <Link href={skillPath(provider, source, slug)} className="min-w-0 truncate hover:text-ink">
          {slug}
        </Link>
        <span className="shrink-0" aria-hidden="true">
          /
        </span>
        <span className="min-w-0 truncate">review</span>
      </nav>

      <div className="mt-3 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-ink">Review trail</h1>
          {data.skill?.status === "delisted" && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
              Delisted - no longer in the catalog; the record below stays as history
            </span>
          )}
        </div>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          The assurance record for <span className="font-semibold text-ink">{slug}</span>: automated
          checks run at submission plus the human approval trail, retained as audit evidence.
          AI-generated artefacts are treated as a hypothesis until validated and approved by a
          qualified reviewer.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            Submitted {fmtDate(version.submittedAt)}
            {version.submitterName ? ` by ${version.submitterName}` : ""}
          </span>
          <span>Published {fmtDate(version.decidedAt)}</span>
          {version.reviewerName && (
            <span>
              Reviewer: <span className="text-ink">{version.reviewerName}</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-2">
        {/* Automated review */}
        <Card className="flex max-h-[34rem] flex-col gap-3 p-6 lg:h-[34rem]">
          <h2 className="shrink-0 text-lg font-bold text-ink">Automated review</h2>
          <p className="shrink-0 text-sm text-muted-foreground">
            <b className="text-ink tabular-nums">{passed}</b> of{" "}
            <span className="tabular-nums">{checks.length}</span> checks passed at submission:
            manifest fields, semver, OpenAPI 3.1 parseability, JSON schemas, and dependency
            resolution.
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <CheckList checks={checks} />
          </div>
        </Card>

        {/* Approval trail */}
        <Card className="flex max-h-[34rem] flex-col gap-4 p-6 lg:h-[34rem]">
          <h2 className="shrink-0 text-lg font-bold text-ink">Approval trail</h2>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <ol>
              {trail.map((t: any, i: number) => {
                const info = nodeInfo(t);
                const last = i === trail.length - 1;
                return (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`mt-1.5 size-3 shrink-0 rounded-full ${info.dot}`} />
                      {!last && <span className="w-px flex-1 bg-border" />}
                    </div>
                    <div className={last ? "flex-1" : "flex-1 pb-5"}>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="font-semibold text-ink">{info.label}</span>
                        <time className="text-xs tabular-nums text-muted-foreground">
                          {when(t.at)}
                        </time>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t.actor.name}
                        {t.actor.role ? (
                          <span className="capitalize"> · {t.actor.role}</span>
                        ) : null}
                      </p>
                      {t.detail?.notes && (
                        <Markdown className="mt-1 border-l-2 border-border pl-3 text-sm text-ink/80 [&_p]:m-0">
                          {t.detail.notes}
                        </Markdown>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {version.reviewNotes && (
              <div className="rounded-lg border border-border bg-accent/50 p-4">
                <h3 className="text-sm font-semibold text-ink">Reviewer notes</h3>
                <Markdown className="mt-1 text-sm text-ink/80">{version.reviewNotes}</Markdown>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
