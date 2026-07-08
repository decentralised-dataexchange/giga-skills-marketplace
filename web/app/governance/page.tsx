"use client";

import { useCallback, useEffect, useState } from "react";
import { api, auth, fmtDate } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckList, type Check } from "@/components/check-list";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROLES = ["builder", "provider", "reviewer", "superadmin"];

export default function GovernancePage() {
  const user = typeof window === "undefined" ? null : auth.user;
  const isSuper = user?.role === "superadmin";
  const [stats, setStats] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [published, setPublished] = useState<any[]>([]);
  const [review, setReview] = useState<any>(null); // open review: {version, skill, org}
  const [activeFile, setActiveFile] = useState("SKILL.md");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [s, q, e, m, ...rest] = await Promise.all([
      api("/api/admin/stats"), api("/api/review/queue"), api("/api/admin/events"), api("/api/marketplace"),
      ...(isSuper ? [api("/api/admin/orgs"), api("/api/admin/users")] : []),
    ]);
    setStats(s.stats);
    setQueue(q.queue);
    setEvents(e.events);
    setPublished(m.skills);
    if (isSuper) {
      setOrgs(rest[0].orgs);
      setUsers(rest[1].users);
    }
  }, [isSuper]);

  const roleOk = user != null && ["reviewer", "superadmin"].includes(user.role);

  useEffect(() => {
    if (!user) location.href = "/login?next=/governance";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState happens after await
    else if (roleOk) load().catch((e) => setMessage(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = (fn: () => Promise<unknown>) => () =>
    fn().then(load).catch((e) => setMessage(e.message));

  async function openReview(versionId: number, status: string) {
    if (status === "submitted") await api(`/api/review/versions/${versionId}/claim`, { method: "POST" });
    setReview(await api(`/api/versions/${versionId}`));
    setActiveFile("SKILL.md");
    setNotes("");
    load();
  }

  async function decide(decision: string) {
    if (decision !== "approve" && !notes.trim()) return setMessage("Add reviewer notes so the provider knows what to fix");
    await api(`/api/review/versions/${review.version.id}/decision`, { method: "POST", json: { decision, notes } });
    setReview(null);
    load();
  }

  const pendingOrgs = orgs.filter((o) => o.status === "pending");
  const statCards = stats
    ? [
        [stats.skillsByStatus.published ?? 0, "Published skills"],
        [stats.reviewQueue, "In review queue"],
        [stats.orgsByStatus.approved ?? 0, "Verified providers"],
        [stats.orgsByStatus.pending ?? 0, "Orgs pending"],
        [stats.totalInstalls, "Skill installs"],
        [(stats.usersByRole.builder ?? 0) + (stats.usersByRole.provider ?? 0), "Builders & providers"],
      ]
    : [];

  const reviewFile = review?.version.files.find((f: any) => f.path === activeFile) ?? review?.version.files[0];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-5 pb-20 pt-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Governance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSuper
            ? "Super admin: organisation verification, user and role management, skill review, delisting, and the full audit trail."
            : "Skill reviewer: claim submissions from the queue, inspect bundles and check reports, and record decisions."}
        </p>
        {!roleOk && user && <p className="mt-2 text-sm text-amber-400">This page needs the reviewer or superadmin role.</p>}
        {message && <p className="mt-2 text-sm text-amber-400">{message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map(([n, label]) => (
          <Card key={label} className="gap-0.5 p-4">
            <span className="text-2xl font-semibold tabular-nums">{n}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </Card>
        ))}
      </div>

      {review && (
        <Card className="gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">
              Reviewing {review.skill.slug} <span className="tabular-nums text-muted-foreground">v{review.version.version}</span>
            </h2>
            <Button variant="secondary" size="sm" onClick={() => setReview(null)}>Close</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Provider: {review.org.name} · License: {review.version.manifest?.license ?? "-"} · Targets:{" "}
            {(review.version.manifest?.targets?.protocols ?? []).join(", ") || "-"}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium">Automated check report</h3>
              <CheckList checks={review.version.checks as Check[]} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">Bundle files</h3>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {review.version.files.map((f: any) => (
                  <button key={f.path} onClick={() => setActiveFile(f.path)}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 font-mono text-xs",
                      f.path === (reviewFile?.path ?? "") ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                    )}>
                    {f.path}
                  </button>
                ))}
              </div>
              <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-black/30 p-3 font-mono text-xs">
                {reviewFile?.content}
              </pre>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reviewer notes (shown to the provider, kept as audit evidence)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. OpenAPI surface matches the declared protocols; rulebook covers revocation; approved." />
            <div className="flex gap-2">
              <Button onClick={() => decide("approve")}>Approve & publish</Button>
              <Button variant="secondary" onClick={() => decide("request_changes")}>Request changes</Button>
              <Button variant="destructive" onClick={() => decide("reject")}>Reject</Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="gap-3 p-6">
        <h2 className="font-medium">Skill review queue <span className="tabular-nums text-muted-foreground">({queue.length})</span></h2>
        {queue.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Skill</th><th>Version</th><th>Provider</th><th>Status</th><th>Reviewer</th><th>Submitted</th><th />
              </tr>
            </thead>
            <tbody>
              {queue.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="py-2.5 font-semibold">{v.slug}</td>
                  <td className="tabular-nums">v{v.version}</td>
                  <td>{v.orgName}</td>
                  <td><StatusBadge status={v.status} /></td>
                  <td className="text-muted-foreground">{v.reviewerName ?? "-"}</td>
                  <td className="tabular-nums">{fmtDate(v.submittedAt)}</td>
                  <td className="text-right">
                    <Button size="sm" onClick={() => openReview(v.id, v.status).catch((e) => setMessage(e.message))}>
                      {v.status === "submitted" ? "Start review" : "Open"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">The queue is empty - nothing awaiting review.</p>
        )}
      </Card>

      {isSuper && (
        <>
          <Card className="gap-3 p-6">
            <h2 className="font-medium">
              Organisation verification <span className="tabular-nums text-muted-foreground">({pendingOrgs.length} pending)</span>
            </h2>
            {pendingOrgs.length ? pendingOrgs.map((o) => (
              <div key={o.id} className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <b>{o.name}</b>
                  <span className="text-xs text-muted-foreground">{fmtDate(o.createdAt)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {o.description}{" "}
                  {o.website && <a className="text-blue-300" href={o.website} target="_blank" rel="noopener">{o.website}</a>}
                </p>
                <p className="text-xs text-muted-foreground">Contact: {o.contact} · Owner: {o.owner.name} ({o.owner.email})</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={act(() =>
                    api(`/api/admin/orgs/${o.id}/decision`, { method: "POST", json: { decision: "approve" } }))}>
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={act(() =>
                    api(`/api/admin/orgs/${o.id}/decision`, { method: "POST", json: { decision: "reject", notes: prompt("Reason for rejection:") ?? "" } }))}>
                    Reject
                  </Button>
                </div>
              </div>
            )) : <p className="py-4 text-center text-sm text-muted-foreground">No organisations awaiting verification.</p>}
          </Card>

          <Card className="gap-3 p-6">
            <h2 className="font-medium">Users & roles</h2>
            <p className="text-sm text-muted-foreground">
              Governance roles (reviewer, super admin) are granted here - they can never be self-assigned at registration.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="py-2.5">{u.name}{u.id === user?.id && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</td>
                    <td className="text-muted-foreground">{u.email}</td>
                    <td>
                      {u.id === user?.id ? (
                        <StatusBadge status={u.role} />
                      ) : (
                        <Select value={u.role} onValueChange={(role) =>
                          role && act(() => api(`/api/admin/users/${u.id}/role`, { method: "POST", json: { role } }))()}>
                          <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </td>
                    <td><StatusBadge status={u.status} /></td>
                    <td className="tabular-nums">{fmtDate(u.createdAt)}</td>
                    <td className="text-right">
                      {u.id !== user?.id && (
                        <Button size="sm" variant={u.status === "active" ? "destructive" : "secondary"}
                          onClick={act(() => api(`/api/admin/users/${u.id}/status`,
                            { method: "POST", json: { status: u.status === "active" ? "suspended" : "active" } }))}>
                          {u.status === "active" ? "Suspend" : "Reactivate"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="gap-3 p-6">
            <h2 className="font-medium">Published skills</h2>
            <table className="w-full text-sm">
              <tbody>
                {published.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-2.5 font-semibold"><a className="hover:underline" href={`/skill/${s.slug}`}>{s.slug}</a></td>
                    <td className="tabular-nums">v{s.version}</td>
                    <td>{s.org.name}</td>
                    <td className="tabular-nums">{s.installs} installs</td>
                    <td className="text-right">
                      <Button size="sm" variant="destructive" onClick={() => {
                        if (confirm(`Delist "${s.slug}" from the marketplace?`))
                          act(() => api(`/api/skills/${s.id}/delist`, { method: "POST" }))();
                      }}>
                        Delist
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <Card className="gap-3 p-6">
        <h2 className="font-medium">Audit trail</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2">When</th><th>Event</th><th>Actor</th><th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 40).map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="whitespace-nowrap py-2 tabular-nums">{new Date(e.at).toLocaleString()}</td>
                <td>{e.type}</td>
                <td>{e.actor.name}</td>
                <td className="font-mono text-xs text-muted-foreground">{JSON.stringify(e.detail ?? {})}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
