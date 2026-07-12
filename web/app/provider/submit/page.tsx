"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, auth } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CodeEditor } from "@/components/code-editor";
import { UsecaseForm } from "@/components/usecase-form";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface BundleFile {
  path: string;
  content: string;
}

const TEMPLATE: BundleFile[] = [
  {
    path: "SKILL.md",
    content: `---\nname: my-wallet-skill\ndescription: >\n  One-line description of what this skill lets an agent integrate.\nprovider: Your Organisation\ntargets:\n  api: https://your-docs-url\n  openapi: ./openapi/api.yaml\n  protocols: [OpenID4VCI-1.0]\ndepends_on:\n  schemas: [./schemas/example.schema.json]\n  rulebooks: [./rulebooks/rules.md]\nauth: API key (X-API-Key header)\nlicense: Apache-2.0\n---\n\n# My wallet skill\n\n## When to use\nDescribe when an agent should apply this skill.\n\n## Steps\n1. Validate input against the schema.\n2. Call the endpoints in openapi/api.yaml in the documented order.\n3. Log audit evidence.\n\n## Validation / done criteria\n- Describe how an integration proves it works.\n`,
  },
  {
    path: "openapi/api.yaml",
    content: `openapi: 3.1.0\ninfo:\n  title: Example API\n  version: 1.0.0\nservers:\n  - url: https://sandbox.example.com/v1\npaths:\n  /example:\n    get:\n      operationId: getExample\n      responses:\n        '200':\n          description: OK\n`,
  },
  {
    path: "schemas/example.schema.json",
    content: `{\n  "$schema": "https://json-schema.org/draft/2020-12/schema",\n  "title": "Example",\n  "type": "object",\n  "properties": { "id": { "type": "string" } }\n}\n`,
  },
  {
    path: "rulebooks/rules.md",
    content: `# Rulebook\n\n## R1\nState the policy rules an integration must honour.\n`,
  },
];

function guessDir(name: string): string {
  if (/skill\.md$/i.test(name)) return "";
  if (/\.ya?ml$/i.test(name)) return "openapi/";
  if (/\.json$/i.test(name)) return "schemas/";
  if (/\.(http|rest)$/i.test(name)) return "examples/";
  if (/\.md$/i.test(name)) return "rulebooks/";
  return "";
}

export default function ProviderSubmitPage() {
  const { denied } = useDashboardGuard("/provider/submit", ["provider"]);
  const [approvedOrg, setApprovedOrg] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [skillOpts, setSkillOpts] = useState<string[]>([]);
  const [files, setFiles] = useState<BundleFile[]>([]);
  const [submitType, setSubmitType] = useState<"skill" | "usecase">("skill");
  const [message, setMessage] = useState("");
  const filePicker = useRef<HTMLInputElement>(null);
  const zipPicker = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [o, pub] = await Promise.all([
      api("/api/orgs/mine"),
      api("/api/marketplace?type=skill&pageSize=48"),
    ]);
    setApprovedOrg(o.orgs.find((x: any) => x.status === "approved") ?? null);
    setSkillOpts(pub.skills.map((x: any) => x.slug));
    setReady(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState happens after await
    if (auth.user?.role === "provider") load().catch((e) => setMessage(e.message));
  }, [load]);

  async function pickedFiles(list: FileList | null) {
    if (!list) return;
    const added = await Promise.all(
      [...list].map(async (f) => ({ path: guessDir(f.name) + f.name, content: await f.text() })),
    );
    setFiles((prev) => [...prev, ...added]);
  }

  async function pickedZip(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const zipBase64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const { files: unzipped } = await api("/api/bundles/unzip", {
        method: "POST",
        json: { zipBase64 },
      });
      setFiles(unzipped);
      setMessage(`Loaded ${unzipped.length} files from ${file.name}. Review below, then submit.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function submitBundle() {
    try {
      const { version } = await api("/api/skills", {
        method: "POST",
        json: { orgId: approvedOrg.id, files },
      });
      setMessage(
        version.status === "submitted"
          ? "Submitted - automated checks passed, now in the review queue."
          : "Automated checks failed - review the report on My submissions.",
      );
      setFiles([]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  const setFile = (i: number, patch: Partial<BundleFile>) =>
    setFiles((prev) => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <DashboardMain
      title="Publish"
      subtitle="Submit a skill bundle or author a use case; automated checks run immediately, then a reviewer decides."
      denied={denied}
    >
      {message && <p className="text-sm font-semibold text-brand">{message}</p>}

      {ready && !approvedOrg ? (
        <Card className="max-w-xl gap-2 p-6">
          <p className="text-sm text-muted-foreground">
            You need a verified organisation before publishing.{" "}
            <Link href="/provider" className="font-semibold text-brand hover:underline">
              Register your organisation →
            </Link>
          </p>
        </Card>
      ) : approvedOrg ? (
        <Card className="gap-4 p-6">
          <div
            role="tablist"
            aria-label="Submission type"
            className="flex gap-1 border-b border-border"
          >
            {(["skill", "usecase"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={submitType === t}
                onClick={() => setSubmitType(t)}
                className={
                  "-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors " +
                  (submitType === t
                    ? "border-brand text-ink"
                    : "border-transparent text-muted-foreground hover:text-ink")
                }
              >
                {t === "skill" ? "Skill (bundle)" : "Use case (form)"}
              </button>
            ))}
          </div>

          {submitType === "skill" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => zipPicker.current?.click()}>
                  Upload .zip bundle
                </Button>
                <Button variant="secondary" onClick={() => filePicker.current?.click()}>
                  Add files...
                </Button>
                <Button variant="ghost" onClick={() => setFiles(TEMPLATE)}>
                  Skill template
                </Button>
                <div className="flex-1" />
                <Button disabled={!files.length} onClick={submitBundle}>
                  Submit for review
                </Button>
              </div>
              <input
                ref={filePicker}
                type="file"
                multiple
                hidden
                onChange={(e) => pickedFiles(e.target.files)}
              />
              <input
                ref={zipPicker}
                type="file"
                accept=".zip"
                hidden
                onChange={(e) => pickedZip(e.target.files)}
              />
              {files.map((f, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      className="max-w-sm font-mono text-xs"
                      value={f.path}
                      onChange={(e) => setFile(i, { path: e.target.value })}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    >
                      Remove
                    </Button>
                  </div>
                  <CodeEditor
                    value={f.content}
                    onChange={(v) => setFile(i, { content: v })}
                    minHeightClass="min-h-40"
                  />
                </div>
              ))}
              {!files.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No files yet. Add files or start from the template.
                </p>
              )}
            </>
          ) : (
            <UsecaseForm orgId={approvedOrg.id} skillOptions={skillOpts} onSubmitted={setMessage} />
          )}
        </Card>
      ) : null}
    </DashboardMain>
  );
}
