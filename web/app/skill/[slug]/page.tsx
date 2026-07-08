"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckList, type Check } from "@/components/check-list";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

function installSnippets(slug: string): [string, string][] {
  return [
    ["opencode", `# opencode.json\n{ "instructions": ["./skills/${slug}/SKILL.md"] }`],
    ["Codex CLI", `# AGENTS.md\nSee ./skills/${slug}/SKILL.md and the openapi/ specs it references.`],
    ["App Builder (this site)", `Open the App Builder and type /${slug} in your message.`],
  ];
}

export default function SkillPage() {
  const { slug } = useParams<{ slug: string }>();
  const [detail, setDetail] = useState<any>(null);
  const [activeFile, setActiveFile] = useState("SKILL.md");
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/marketplace/${slug}`)
      .then(setDetail)
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error) return <main className="mx-auto max-w-3xl p-10 text-muted-foreground">{error}</main>;
  if (!detail) return <main className="mx-auto max-w-3xl p-10 text-muted-foreground">Loading...</main>;

  const { skill, org, version, history } = detail;
  const manifest = version.manifest ?? {};
  const file = version.files.find((f: any) => f.path === activeFile) ?? version.files[0];
  const deps = [...(manifest.depends_on?.schemas ?? []), ...(manifest.depends_on?.rulebooks ?? [])];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8">
      <Link href="/" className="text-sm text-blue-300 hover:underline">← Marketplace</Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">{skill.slug}</h1>
          <p className="mt-1 text-muted-foreground">{manifest.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <StatusBadge status="published" />
            <Badge variant="secondary" className="tabular-nums">v{version.version}</Badge>
            <Badge variant="secondary">{manifest.license ?? "unlicensed"}</Badge>
            {(manifest.targets?.protocols ?? []).map((p: string) => (
              <Badge key={p} className="border-0 bg-blue-500/15 text-blue-300">{p}</Badge>
            ))}
          </div>
        </div>
        <div className="text-right">
          <Button nativeButton={false} render={<Link href={`/builder?install=${skill.slug}`} />}>Use in App Builder</Button>
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            {skill.installs} installs · published {fmtDate(version.publishedAt)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card className="gap-3 p-5">
            <h2 className="font-medium">Bundle contents</h2>
            <div className="flex flex-wrap gap-1.5">
              {version.files.map((f: any) => (
                <button
                  key={f.path}
                  onClick={() => setActiveFile(f.path)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 font-mono text-xs transition-colors",
                    f.path === (file?.path ?? "") ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.path}
                </button>
              ))}
            </div>
            <pre className="max-h-[520px] overflow-auto rounded-lg border border-border bg-black/30 p-4 font-mono text-xs leading-relaxed">
              {file?.content}
            </pre>
          </Card>
          <Card className="gap-3 p-5">
            <h2 className="font-medium">Install into your agent</h2>
            <p className="text-sm text-muted-foreground">
              The same bundle installs on different agents via a thin, per-agent step; its contents do not change.
            </p>
            {installSnippets(skill.slug).map(([agent, snippet]) => (
              <div key={agent}>
                <h3 className="mb-1 text-sm font-medium">{agent}</h3>
                <pre className="overflow-auto rounded-lg border border-border bg-black/30 p-3 font-mono text-xs">{snippet}</pre>
              </div>
            ))}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="gap-2 p-5">
            <h2 className="font-medium">Provider</h2>
            <p className="text-sm">
              <b>{org.name}</b>{" "}
              {org.status === "approved" && <Badge className="ml-1 border-0 bg-emerald-500/15 text-emerald-400">Verified</Badge>}
            </p>
            <p className="text-sm text-muted-foreground">{org.description}</p>
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener" className="text-sm text-blue-300 hover:underline">
                {org.website}
              </a>
            )}
          </Card>
          <Card className="gap-2 p-5">
            <h2 className="font-medium">Review evidence</h2>
            <p className="text-xs text-muted-foreground">
              Automated checks run at submission; a human reviewer approved this version before publication.
            </p>
            <CheckList checks={version.checks as Check[]} />
          </Card>
          <Card className="gap-2 p-5">
            <h2 className="font-medium">Version history</h2>
            {history.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <span className="tabular-nums">v{h.version}</span>
                <StatusBadge status={h.status} />
                <span className="text-xs text-muted-foreground">{fmtDate(h.publishedAt)}</span>
              </div>
            ))}
          </Card>
          <Card className="gap-2 p-5">
            <h2 className="font-medium">Depends on</h2>
            <div className="font-mono text-xs text-muted-foreground">
              {deps.length ? deps.map((d: string) => <div key={d} className="py-0.5">{d}</div>) : "none declared"}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
