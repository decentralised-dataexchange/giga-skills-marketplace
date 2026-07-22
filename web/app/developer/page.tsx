"use client";

import { notFound } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, auth, fmtDate } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { MultiSelect } from "@/components/multi-select";
import { MarkdownEditor } from "@/components/markdown-editor";
import { FEATURES } from "@/lib/features";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DeveloperPage() {
  if (!FEATURES.showcase) notFound();
  const [skillOpts, setSkillOpts] = useState<string[]>([]);
  const [usecaseOpts, setUsecaseOpts] = useState<string[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", description: "", videoUrl: "", repoUrl: "" });
  const [skills, setSkills] = useState<string[]>([]);
  const [usecases, setUsecases] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [sk, uc, m] = await Promise.all([
      api("/api/marketplace?type=skill&pageSize=48"),
      api("/api/marketplace?type=usecase&pageSize=48"),
      api("/api/applications/mine"),
    ]);
    setSkillOpts(sk.skills.map((s: any) => s.slug));
    setUsecaseOpts(uc.skills.map((s: any) => s.slug));
    setMine(m.applications);
  }, []);

  useEffect(() => {
    if (!auth.user) {
      location.href = "/login?next=/developer";
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState happens after await
    load().catch((e) => setErr(e.message));
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setForm({ title: "", description: "", videoUrl: "", repoUrl: "" });
    setSkills([]);
    setUsecases([]);
  }

  function startEdit(a: any) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      description: a.description ?? "",
      videoUrl: a.videoUrl ?? "",
      repoUrl: a.repoUrl ?? "",
    });
    setSkills(a.skills ?? []);
    setUsecases(a.usecases ?? []);
    setMsg("");
    setErr("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const json = { ...form, skills, usecases };
      if (editingId) {
        await api(`/api/applications/${editingId}`, { method: "PATCH", json });
        setMsg("Application updated.");
      } else {
        await api("/api/applications", { method: "POST", json });
        setMsg("Application submitted to the showcase.");
      }
      resetForm();
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function removeApp(a: any) {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try {
      await api(`/api/applications/${a.id}`, { method: "DELETE" });
      if (editingId === a.id) resetForm();
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="mx-auto w-full max-w-none space-y-4 px-5 pb-20 pt-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Developer Console</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Showcase an application you built with published skills and use cases: add a title,
          description, a demo video, and tag which skills and use cases you used.
        </p>
      </div>

      <Card className="max-w-2xl gap-4 p-6">
        <h2 className="text-lg font-bold text-ink">
          {editingId ? "Edit application" : "Submit an application"}
        </h2>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <label htmlFor="app-title" className="text-sm font-medium text-ink">
              Title
            </label>
            <Input
              id="app-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="app-desc" className="text-sm font-medium text-ink">
              Description
            </label>
            <MarkdownEditor
              id="app-desc"
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
              placeholder="What you built and how it uses the skills / use cases."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="app-video" className="text-sm font-medium text-ink">
                Demo video URL
              </label>
              <Input
                id="app-video"
                type="url"
                placeholder="https://youtube.com/watch?v=…"
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="app-repo" className="text-sm font-medium text-ink">
                Source repo URL (optional)
              </label>
              <Input
                id="app-repo"
                type="url"
                placeholder="https://github.com/…"
                value={form.repoUrl}
                onChange={(e) => setForm({ ...form, repoUrl: e.target.value })}
              />
            </div>
          </div>
          <MultiSelect
            label="Skills used"
            options={skillOpts}
            selected={skills}
            onChange={setSkills}
            placeholder="Search skills…"
          />
          <MultiSelect
            label="Use cases used"
            options={usecaseOpts}
            selected={usecases}
            onChange={setUsecases}
            placeholder="Search use cases…"
          />
          {err && <p className="text-sm font-medium text-destructive">{err}</p>}
          {msg && (
            <p className="text-sm font-medium text-emerald-700" role="status">
              {msg}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit">{editingId ? "Save changes" : "Submit to showcase"}</Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      {mine.length > 0 && (
        <Card className="gap-3 p-6">
          <h2 className="text-lg font-bold text-ink">Your applications</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Title</th>
                  <th>Status</th>
                  <th>Skills / use cases</th>
                  <th>Submitted</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {mine.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="py-2.5 font-semibold text-ink">{a.title}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="text-muted-foreground">
                      {[...a.usecases, ...a.skills].join(", ") || "-"}
                    </td>
                    <td className="tabular-nums text-muted-foreground">{fmtDate(a.createdAt)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => startEdit(a)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removeApp(a)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </main>
  );
}
