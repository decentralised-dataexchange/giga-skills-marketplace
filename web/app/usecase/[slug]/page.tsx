"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ListChecks } from "lucide-react";
import { api, timeAgo } from "@/lib/client";
import { Card } from "@/components/ui/card";
import { OfficialBadge } from "@/components/official-badge";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Normalise a journey's prompts to steps, tolerating the legacy string shape.
function steps(j: any): { prompt: string; skills: string[] }[] {
  return (j.prompts ?? []).map((p: any) =>
    typeof p === "string" ? { prompt: p, skills: j.skills ?? [] } : { prompt: p.prompt ?? "", skills: p.skills ?? [] },
  );
}

function PromptBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg border border-border bg-muted p-3">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="absolute right-2 top-2 rounded border border-border bg-white px-2 py-0.5 text-xs font-semibold text-brand hover:bg-accent"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <p className="whitespace-pre-wrap pr-14 font-mono text-xs leading-relaxed text-ink/80">{text}</p>
    </div>
  );
}

export default function UsecasePage() {
  const { slug } = useParams<{ slug: string }>();
  const [detail, setDetail] = useState<any>(null);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api(`/api/marketplace/${slug}`)
      .then(setDetail)
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error) return <main className="mx-auto max-w-[1536px] px-5 py-10 text-muted-foreground">{error}</main>;
  if (!detail) return <main className="mx-auto max-w-[1536px] px-5 py-10 text-muted-foreground">Loading...</main>;

  const { skill, org, version } = detail;
  const manifest = version.manifest ?? {};
  const journeys: any[] = manifest.journeys ?? [];
  const prerequisites: string[] = manifest.prerequisites ?? [];
  const usesSkills: string[] = manifest.uses_skills ?? [];
  const demos: any[] = manifest.demos ?? [];
  const confirmedCount = Object.values(confirmed).filter(Boolean).length;
  const allConfirmed = prerequisites.length > 0 && confirmedCount === prerequisites.length;

  return (
    <main className="mx-auto w-full max-w-[1536px] px-5 pb-20 pt-8">
      <Link href="/" className="text-sm font-semibold text-brand hover:underline">
        ← Catalog
      </Link>

      {/* Header */}
      <div className="mt-3 border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">Use case</span>
              <OfficialBadge official={!!skill.official} />
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{manifest.title ?? skill.slug}</h1>
            <Markdown className="mt-2 max-w-3xl text-muted-foreground">{manifest.description}</Markdown>
          </div>
          <a
            href="#journeys"
            className="shrink-0 rounded-[10px] bg-brand px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-brand-dark"
          >
            View journeys
          </a>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span>{journeys.length} journeys</span>
          <span>{manifest.license ?? "unlicensed"}</span>
          <span>Published {timeAgo(version.publishedAt)}</span>
          <Link href={`/skill/${skill.slug}/review`} className="font-semibold text-brand hover:underline">
            Review trail →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          {/* Prerequisites */}
          {prerequisites.length > 0 && (
            <Card className="gap-3 border-brand/30 p-6">
              <div className="flex items-center gap-2">
                <ListChecks className="size-5 text-brand" />
                <h2 className="text-lg font-bold text-ink">Prerequisites</h2>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {confirmedCount}/{prerequisites.length} confirmed
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Confirm each item is in place in your environment before running the journeys.
              </p>
              <ul className="space-y-2">
                {prerequisites.map((p, i) => (
                  <li key={i}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent/40">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 shrink-0 accent-brand"
                        checked={!!confirmed[i]}
                        onChange={(e) => setConfirmed((c) => ({ ...c, [i]: e.target.checked }))}
                      />
                      <span className="text-ink/80">{p}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {allConfirmed && (
                <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700" role="status">
                  <Check className="size-4" /> All prerequisites confirmed. You are ready to run the journeys.
                </p>
              )}
            </Card>
          )}

          {/* Journeys */}
          <div id="journeys" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-bold text-ink">Journeys</h2>
            {journeys.map((j, i) => (
              <Card key={i} className={cn("gap-3 p-6", !allConfirmed && prerequisites.length > 0 && "opacity-95")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    {j.tag ?? `#${i + 1}`}
                  </span>
                  <h3 className="text-base font-bold text-ink">{j.title}</h3>
                </div>
                {j.description && <Markdown className="text-sm text-muted-foreground">{j.description}</Markdown>}
                {steps(j).map((step, k) => (
                  <div key={k} className="space-y-2">
                    {j.prompts.length > 1 && (
                      <p className="text-xs font-semibold text-muted-foreground">Prompt {k + 1}</p>
                    )}
                    {step.skills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Uses</span>
                        {step.skills.map((sk: string) => (
                          <Link key={sk} href={`/skill/${sk}`} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-brand-dark hover:underline">
                            {sk}
                          </Link>
                        ))}
                      </div>
                    )}
                    <PromptBox text={step.prompt} />
                  </div>
                ))}
                {j.done && (
                  <p className="flex items-start gap-1.5 text-sm text-ink/80">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>
                      <b>Done when:</b> {j.done}
                    </span>
                  </p>
                )}
              </Card>
            ))}
          </div>

          {/* Demos */}
          {demos.length > 0 && (
            <Card className="gap-3 p-6">
              <h2 className="text-lg font-bold text-ink">Demo &amp; evidence</h2>
              <ul className="space-y-2">
                {demos.map((d: any, i: number) => (
                  <li key={i}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-brand hover:underline"
                    >
                      {d.title ?? d.url} ↗
                    </a>
                    {d.note && <span className="text-sm text-muted-foreground"> — {d.note}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section>
            <h2 className="text-sm font-semibold text-ink">Skills used</h2>
            <div className="mt-2 space-y-1.5">
              {usesSkills.length ? (
                usesSkills.map((sk) => (
                  <Link
                    key={sk}
                    href={`/skill/${sk}`}
                    className="block truncate font-mono text-sm text-brand hover:underline"
                  >
                    {sk}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">none declared</p>
              )}
            </div>
          </section>

          <section className="border-t border-border pt-4">
            <h2 className="text-sm font-semibold text-ink">Install into your agent</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Install the skills above into your own AI coding agent, then run the journeys in order. Later journeys
              consume earlier outputs.
            </p>
          </section>

          <section className="border-t border-border pt-4">
            <h2 className="text-sm font-semibold text-ink">Provider</h2>
            <p className="mt-2 text-sm">
              <b className="text-ink">{org.name}</b>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{org.description}</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
