"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Download,
  FileText,
  Folder,
  Package,
  Scale,
} from "lucide-react";
import { api, fmtDate, timeAgo } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { CodeViewer } from "@/components/code-viewer";
import { OfficialBadge } from "@/components/official-badge";
import { StandardPill } from "@/components/standard-pill";
import { Tip } from "@/components/tip";
import { cn } from "@/lib/utils";
import { providerPath, skillPath, skillReviewPath } from "@/lib/routes";

/* eslint-disable @typescript-eslint/no-explicit-any */

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export default function SkillPage() {
  const { provider, slug } = useParams<{ provider: string; slug: string }>();
  const router = useRouter();
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

  // Skill slugs are globally unique, so the provider segment is a claim about
  // ownership. When it names the wrong provider, move to the canonical URL.
  const ownerSlug: string | null = detail?.org?.slug ?? null;
  useEffect(() => {
    if (ownerSlug && ownerSlug !== provider) router.replace(skillPath(ownerSlug, slug));
  }, [ownerSlug, provider, slug, router]);

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
  const handle = org.slug ?? provider;
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
      <Link
        href={providerPath(handle)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {org.name}
      </Link>

      {/* Repository header */}
      <div className="mt-3 border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Package className="size-6 shrink-0 text-brand" aria-hidden="true" />
            <h1 className="flex flex-wrap items-center gap-x-1.5 text-xl font-normal sm:text-2xl">
              <Link
                href={providerPath(handle)}
                className="font-semibold text-brand hover:underline"
              >
                {org.name}
              </Link>
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
              <Download className="size-4" aria-hidden="true" />
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
              <Scale className="size-4" aria-hidden="true" />
              {license}
            </span>
          </Tip>
          <Tip content={`Published ${fmtDate(version.publishedAt)}`}>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
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
                      <Folder className="size-4 shrink-0 text-brand" aria-hidden="true" />
                    ) : (
                      <FileText
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
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
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
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
                <Download className="size-3.5" aria-hidden="true" /> Download .zip
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
                <Scale className="size-4" aria-hidden="true" /> {license}
              </li>
              <li className="flex items-center gap-2">
                <Clock className="size-4" aria-hidden="true" /> Published{" "}
                {timeAgo(version.publishedAt)}
              </li>
            </ul>
          </section>

          <SidebarSection title="Provider">
            <p className="text-sm">
              <Link href={providerPath(handle)} className="font-bold text-ink hover:underline">
                {org.name}
              </Link>{" "}
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
              href={skillReviewPath(handle, skill.slug)}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              View review trail
              <ArrowRight className="size-4" aria-hidden="true" />
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
