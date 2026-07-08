"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, auth, fmtDate } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckList, type Check } from "@/components/check-list";
import { StatusBadge } from "@/components/status-badge";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface BundleFile {
  path: string;
  content: string;
}

const TEMPLATE: BundleFile[] = [
  {
    path: "SKILL.md",
    content: `---\nname: my-wallet-skill\ndescription: >\n  One-line description of what this skill lets an agent integrate.\nversion: 1.0.0\nprovider: Your Organisation\ntargets:\n  api: https://your-docs-url\n  openapi: ./openapi/api.yaml\n  protocols: [OpenID4VCI-1.0]\ndepends_on:\n  schemas: [./schemas/example.schema.json]\n  rulebooks: [./rulebooks/rules.md]\nauth: API key (X-API-Key header)\nlicense: Apache-2.0\n---\n\n# My wallet skill\n\n## When to use\nDescribe when an agent should apply this skill.\n\n## Steps\n1. Validate input against the schema.\n2. Call the endpoints in openapi/api.yaml in the documented order.\n3. Log audit evidence.\n\n## Validation / done criteria\n- Describe how an integration proves it works.\n`,
  },
  {
    path: "openapi/api.yaml",
    content: `openapi: 3.1.0\ninfo:\n  title: Example API\n  version: 1.0.0\nservers:\n  - url: https://sandbox.example.com/v1\npaths:\n  /example:\n    get:\n      operationId: getExample\n      responses:\n        '200':\n          description: OK\n`,
  },
  {
    path: "schemas/example.schema.json",
    content: `{\n  "$schema": "https://json-schema.org/draft/2020-12/schema",\n  "title": "Example",\n  "type": "object",\n  "properties": { "id": { "type": "string" } }\n}\n`,
  },
  { path: "rulebooks/rules.md", content: `# Rulebook\n\n## R1\nState the policy rules an integration must honour.\n` },
];

function guessDir(name: string): string {
  if (/skill\.md$/i.test(name)) return "";
  if (/\.ya?ml$/i.test(name)) return "openapi/";
  if (/\.json$/i.test(name)) return "schemas/";
  if (/\.(http|rest)$/i.test(name)) return "examples/";
  if (/\.md$/i.test(name)) return "rulebooks/";
  return "";
}

export default function ProviderPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [files, setFiles] = useState<BundleFile[]>([]);
  const [orgForm, setOrgForm] = useState({ name: "", website: "", description: "" });
  const [message, setMessage] = useState("");
  const [openChecks, setOpenChecks] = useState<number | null>(null);
  const filePicker = useRef<HTMLInputElement>(null);
  const zipPicker = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [o, s] = await Promise.all([api("/api/orgs/mine"), api("/api/skills/mine")]);
    setOrgs(o.orgs);
    setSkills(s.skills);
  }, []);

  useEffect(() => {
    if (!auth.user) location.href = "/login?next=/provider";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState happens after await
    else load().catch((e) => setMessage(e.message));
  }, [load]);

  const approvedOrg = orgs.find((o) => o.status === "approved");

  async function submitOrg(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/orgs", { method: "POST", json: orgForm });
      setMessage("Organisation submitted for verification");
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

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
      const { files: unzipped } = await api("/api/bundles/unzip", { method: "POST", json: { zipBase64 } });
      setFiles(unzipped);
      setMessage(`Loaded ${unzipped.length} files from ${file.name}. Review below, then submit.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function submitBundle() {
    try {
      const { version } = await api("/api/skills", { method: "POST", json: { orgId: approvedOrg.id, files } });
      setMessage(version.status === "submitted"
        ? "Submitted - automated checks passed, now in the review queue"
        : "Automated checks failed - see the check report below");
      setFiles([]);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  const setFile = (i: number, patch: Partial<BundleFile>) =>
    setFiles((prev) => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-5 pb-20 pt-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Provider Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register your organisation, submit skill bundles, and track them through review - the same submit →
          automated checks → human review → publish pipeline used by app stores.
        </p>
        {message && <p className="mt-2 text-sm text-blue-300">{message}</p>}
      </div>

      {!orgs.length ? (
        <Card className="max-w-xl gap-4 p-6">
          <h2 className="font-medium">1 · Register your organisation</h2>
          <form className="space-y-3" onSubmit={submitOrg}>
            <Input placeholder="Organisation name" required value={orgForm.name}
              onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
            <Input placeholder="Website (https://...)" value={orgForm.website}
              onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })} />
            <Textarea placeholder="What do you provide?" required value={orgForm.description}
              onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })} />
            <Button type="submit">Submit for verification</Button>
          </form>
        </Card>
      ) : (
        orgs.map((o) => (
          <Card key={o.id} className="gap-2 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">{o.name}</h2>
              <StatusBadge status={o.status} />
            </div>
            <p className="text-sm text-muted-foreground">{o.description}</p>
            {o.decisionNotes && (
              <p className="text-sm text-muted-foreground"><b>Reviewer notes:</b> {o.decisionNotes}</p>
            )}
          </Card>
        ))
      )}

      {approvedOrg && (
        <Card className="gap-4 p-6">
          <div>
            <h2 className="font-medium">2 · Submit a skill bundle</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A bundle is SKILL.md (manifest + instructions) plus openapi/, schemas/, rulebooks/, and examples/.
              Automated checks run immediately; a reviewer then approves, rejects, or requests changes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => zipPicker.current?.click()}>Upload .zip bundle</Button>
            <Button variant="secondary" onClick={() => filePicker.current?.click()}>Add files...</Button>
            <Button variant="secondary" onClick={() => setFiles((p) => [...p, { path: "SKILL.md", content: "" }])}>
              Add empty file
            </Button>
            <Button variant="ghost" onClick={() => setFiles(TEMPLATE)}>Start from template</Button>
            <div className="flex-1" />
            <Button disabled={!files.length} onClick={submitBundle}>Submit for review</Button>
          </div>
          <input ref={filePicker} type="file" multiple hidden onChange={(e) => pickedFiles(e.target.files)} />
          <input ref={zipPicker} type="file" accept=".zip" hidden onChange={(e) => pickedZip(e.target.files)} />
          {files.map((f, i) => (
            <div key={i} className="space-y-2">
              <div className="flex gap-2">
                <Input className="max-w-sm font-mono text-xs" value={f.path}
                  onChange={(e) => setFile(i, { path: e.target.value })} />
                <Button variant="destructive" size="sm"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              </div>
              <Textarea className="min-h-28 font-mono text-xs" value={f.content}
                onChange={(e) => setFile(i, { content: e.target.value })} />
            </div>
          ))}
          {!files.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No files yet. Add files or start from the template.
            </p>
          )}
        </Card>
      )}

      {skills.length > 0 && (
        <>
          <h2 className="pt-2 text-lg font-medium">Your skills</h2>
          {skills.map((s) => (
            <Card key={s.id} className="gap-3 p-6">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{s.slug}</span>
                <StatusBadge status={s.status} />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2">Version</th><th>Status</th><th>Submitted</th><th>Reviewer notes</th><th />
                  </tr>
                </thead>
                <tbody>
                  {s.versions.map((v: any) => (
                    <>
                      <tr key={v.id} className="border-t border-border">
                        <td className="py-2 tabular-nums">v{v.version}</td>
                        <td><StatusBadge status={v.status} /></td>
                        <td className="tabular-nums">{fmtDate(v.submittedAt)}</td>
                        <td className="max-w-xs text-muted-foreground">{v.reviewNotes ?? "-"}</td>
                        <td className="text-right">
                          <Button variant="secondary" size="sm"
                            onClick={() => setOpenChecks(openChecks === v.id ? null : v.id)}>
                            Checks
                          </Button>
                        </td>
                      </tr>
                      {openChecks === v.id && (
                        <tr>
                          <td colSpan={5} className="pb-3">
                            <CheckList checks={v.checks as Check[]} />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </>
      )}
    </main>
  );
}
