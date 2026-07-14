"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, fmtDate, timeAgo } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { CodeViewer } from "@/components/code-viewer";
import { OfficialBadge } from "@/components/official-badge";
import { StandardPill } from "@/components/standard-pill";
import { Tip } from "@/components/tip";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

/* Small GitHub-style glyphs (currentColor). */
const Icon = {
  Repo: (p: any) => (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
    </svg>
  ),
  File: (p: any) => (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
    </svg>
  ),
  Folder: (p: any) => (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M0 2.75C0 1.784.784 1 1.75 1H5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1h6.75c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25Z" />
    </svg>
  ),
  Star: (p: any) => (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
    </svg>
  ),
  Law: (p: any) => (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M8.75.75V2h.985c.304 0 .603.08.867.231l1.29.736c.038.022.08.033.124.033h2.234a.75.75 0 0 1 0 1.5h-.427l2.111 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.006.005-.01.01-.045.04c-.21.176-.441.327-.686.45C14.556 10.78 13.88 11 13 11a3.756 3.756 0 0 1-1.92-.474 3.775 3.775 0 0 1-.686-.45l-.045-.04-.016-.015-.006-.006-.004-.004v-.001a.75.75 0 0 1-.154-.838L12.279 4.5H12.11a1.755 1.755 0 0 1-.124.033l-1.29.736a1.75 1.75 0 0 1-.867.231H8.75V13h2.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.5V5.5H5.264a1.75 1.75 0 0 1-.867-.231l-1.29-.736A.25.25 0 0 0 2.984 4.5h-.17l2.112 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.016.015-.045.04c-.21.176-.441.327-.686.45C3.556 10.78 2.88 11 2 11a3.756 3.756 0 0 1-1.92-.474 3.775 3.775 0 0 1-.686-.45l-.045-.04-.016-.015-.006-.006-.004-.004v-.001a.75.75 0 0 1-.154-.838L1.28 4.5H.75a.75.75 0 0 1 0-1.5h2.234a.249.249 0 0 0 .125-.033l1.288-.737c.265-.15.564-.23.868-.23h.985V.75a.75.75 0 0 1 1.5 0Z" />
    </svg>
  ),
  Tag: (p: any) => (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M1 7.775V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 0 1 0 2.474l-5.026 5.026a1.75 1.75 0 0 1-2.474 0l-6.25-6.25A1.752 1.752 0 0 1 1 7.775Zm3.5-1.775a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </svg>
  ),
  Clock: (p: any) => (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z" />
    </svg>
  ),
  Download: (p: any) => (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M7.47 10.78a.75.75 0 0 0 1.06 0l3.75-3.75a.75.75 0 0 0-1.06-1.06L8.75 8.44V1.75a.75.75 0 0 0-1.5 0v6.69L4.78 5.97a.75.75 0 0 0-1.06 1.06ZM3.75 13a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5Z" />
    </svg>
  ),
};

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export default function SkillPage() {
  const { slug } = useParams<{ slug: string }>();
  const [detail, setDetail] = useState<any>(null);
  const [activeFile, setActiveFile] = useState("SKILL.md");
  const [error, setError] = useState("");
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api(`/api/marketplace/${slug}`)
      .then(setDetail)
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error) return <main className="mx-auto max-w-3xl p-10 text-muted-foreground">{error}</main>;
  if (!detail)
    return <main className="mx-auto max-w-3xl p-10 text-muted-foreground">Loading...</main>;

  const { skill, org, version } = detail;
  const manifest = version.manifest ?? {};
  const files: any[] = version.files ?? [];
  const file = files.find((f: any) => f.path === activeFile) ?? files[0];
  const deps = [...(manifest.depends_on?.schemas ?? []), ...(manifest.depends_on?.rulebooks ?? [])];
  const protocols: string[] = Array.isArray(manifest.targets?.protocols)
    ? manifest.targets.protocols
    : typeof manifest.metadata?.protocols === "string"
      ? manifest.metadata.protocols.split(/\s*,\s*/).filter(Boolean)
      : [];
  const lineCount = (file?.content ?? "").replace(/\n$/, "").split("\n").length;
  const license = manifest.license ?? "unlicensed";
  const checks: any[] = version.checks ?? [];
  const checksPassed = checks.filter((c: any) => c.status === "pass").length;
  const command = org.slug ? `npx skills add ${origin}/${org.slug} --skill ${skill.slug}` : "";

  function copyCommand() {
    if (!command) return;
    navigator.clipboard?.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <main className="mx-auto w-full max-w-[1536px] px-5 sm:px-6 lg:px-8 pb-20 pt-8">
      <Link href="/" className="text-sm font-semibold text-brand hover:underline">
        ← Marketplace
      </Link>

      {/* Repository header */}
      <div className="mt-3 border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Icon.Repo className="size-6 shrink-0 text-brand" />
            <h1 className="flex flex-wrap items-center gap-x-1.5 text-xl font-normal sm:text-2xl">
              <span className="font-semibold text-brand">{org.name}</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-bold text-ink">{skill.slug}</span>
              <OfficialBadge official={!!skill.official} className="ml-1" />
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={copyCommand}
              disabled={!command}
              className="inline-flex items-center gap-2 rounded-[10px] bg-brand px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-50"
            >
              {copied ? "Copied" : "Copy install command"}
            </button>
            <a
              href={`/api/bundles/${skill.slug}`}
              download={`${skill.slug}.zip`}
              className="inline-flex items-center gap-2 rounded-[10px] border-2 border-brand bg-white px-5 py-3 text-base font-semibold text-brand transition-colors hover:bg-accent"
            >
              <Icon.Download className="size-4" />
              Download .zip
            </a>
          </div>
        </div>

        <p className="mt-3 max-w-3xl text-muted-foreground">{manifest.description}</p>

        {protocols.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {protocols.map((p) => (
              <StandardPill key={p} code={p} />
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Tip content="Skill licence">
            <span className="flex items-center gap-1.5">
              <Icon.Law className="size-4" />
              {license}
            </span>
          </Tip>
          <Tip content={`Published ${fmtDate(version.publishedAt)}`}>
            <span className="flex items-center gap-1.5">
              <Icon.Clock className="size-4" />
              Published {timeAgo(version.publishedAt)}
            </span>
          </Tip>
        </div>
      </div>

      {/* Body: files + About sidebar */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {/* File list */}
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/60 px-4 py-2.5 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-medium text-ink">{org.name}</span>
                <span className="truncate text-muted-foreground">
                  Published {timeAgo(version.publishedAt)}
                </span>
              </div>
              <span className="shrink-0 text-muted-foreground">{files.length} files</span>
            </div>
            <ul className="divide-y divide-border">
              {files.map((f: any) => (
                <li key={f.path}>
                  <button
                    type="button"
                    onClick={() => setActiveFile(f.path)}
                    aria-current={f.path === file?.path ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent/50",
                      f.path === file?.path && "bg-accent/70",
                    )}
                  >
                    {f.path.includes("/") ? (
                      <Icon.Folder className="size-4 shrink-0 text-brand" />
                    ) : (
                      <Icon.File className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate font-mono text-sm text-ink">{f.path}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Selected file viewer */}
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/60 px-4 py-2.5">
              <span className="flex items-center gap-2 truncate font-mono text-sm text-ink">
                <Icon.File className="size-4 shrink-0 text-muted-foreground" />
                {file?.path}
              </span>
              <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                {lineCount} lines
              </span>
            </div>
            <CodeViewer content={file?.content ?? ""} bare />
          </div>
        </div>

        {/* About sidebar */}
        <aside className="space-y-4">
          <section>
            <h2 className="text-sm font-semibold text-ink">Install</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add this skill to your AI coding agent:
            </p>
            {command && (
              <div className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted p-3">
                <code className="whitespace-nowrap font-mono text-xs text-ink">{command}</code>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {command && (
                <button
                  type="button"
                  onClick={copyCommand}
                  className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-ink transition-colors hover:bg-accent"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
              <a
                href={`/api/bundles/${skill.slug}`}
                download={`${skill.slug}.zip`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-xs font-semibold text-ink transition-colors hover:bg-accent"
              >
                <Icon.Download className="size-3.5" /> Download .zip
              </a>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-ink">About</h2>
            <p className="mt-2 text-sm text-muted-foreground">{manifest.description}</p>
            {protocols.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {protocols.map((p) => (
                  <StandardPill key={p} code={p} className="px-2.5 py-0.5" />
                ))}
              </div>
            )}
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Icon.Law className="size-4" /> {license}
              </li>
              <li className="flex items-center gap-2">
                <Icon.Clock className="size-4" /> Published {timeAgo(version.publishedAt)}
              </li>
            </ul>
          </section>

          <SidebarSection title="Provider">
            <p className="text-sm">
              <b className="text-ink">{org.name}</b>{" "}
              {org.status === "approved" && (
                <Badge className="ml-1 border-0 bg-emerald-100 text-emerald-700">Verified</Badge>
              )}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{org.description}</p>
            {org.website && (
              <a
                href={org.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm font-semibold text-brand hover:underline"
              >
                {org.website}
              </a>
            )}
          </SidebarSection>

          <SidebarSection title="Assurance">
            <p className="text-sm text-muted-foreground">
              Automated checks passed and a human reviewer approved this version before publication.
            </p>
            <p className="mt-2 text-sm text-ink">
              <b className="tabular-nums">{checksPassed}</b> of{" "}
              <span className="tabular-nums">{checks.length}</span> automated checks passed
            </p>
            <Link
              href={`/skill/${skill.slug}/review`}
              className="mt-2 inline-block text-sm font-semibold text-brand hover:underline"
            >
              View review trail →
            </Link>
          </SidebarSection>

          <SidebarSection title="Depends on">
            <div className="font-mono text-xs text-muted-foreground">
              {deps.length
                ? deps.map((d: string) => (
                    <div key={d} className="py-0.5">
                      {d}
                    </div>
                  ))
                : "none declared"}
            </div>
          </SidebarSection>
        </aside>
      </div>
    </main>
  );
}
