"use client";

import { useCallback, useEffect, useState } from "react";
import { api, auth, fmtDate } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarkdownEditor } from "@/components/markdown-editor";
import { CheckList, type Check } from "@/components/check-list";
import { CodeViewer } from "@/components/code-viewer";
import { StatusBadge } from "@/components/status-badge";
import { Pagination, pageSlice } from "@/components/pagination";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PAGE = 10;

export default function ReviewQueuePage() {
  const { denied } = useDashboardGuard("/governance/review", ["reviewer", "superadmin"]);
  const [queue, setQueue] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [review, setReview] = useState<any>(null);
  const [activeFile, setActiveFile] = useState("SKILL.md");
  const [notes, setNotes] = useState("");
  const [official, setOfficial] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const q = await api("/api/review/queue");
    setQueue(q.queue);
  }, []);

  useEffect(() => {
    if (auth.user && ["reviewer", "superadmin"].includes(auth.user.role)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState after await
      load().catch((e) => setMessage(e.message));
    }
  }, [load]);

  async function openReview(versionId: string, status: string) {
    if (status === "submitted")
      await api(`/api/review/versions/${versionId}/claim`, { method: "POST" });
    const r = await api(`/api/versions/${versionId}`);
    setReview(r);
    setActiveFile("SKILL.md");
    setNotes("");
    setOfficial(!!r.skill?.official);
    load();
  }

  async function decide(decision: string) {
    if (decision !== "approve" && !notes.trim())
      return setMessage("Add reviewer notes so the provider knows what to fix.");
    await api(`/api/review/versions/${review.version.id}/decision`, {
      method: "POST",
      json: { decision, notes, official },
    });
    setReview(null);
    load();
  }

  const reviewFile =
    review?.version.files.find((f: any) => f.path === activeFile) ?? review?.version.files[0];

  return (
    <DashboardMain
      title="Review queue"
      subtitle="Claim submissions, inspect the bundle and checks, and record a decision."
      denied={denied}
    >
      {message && <p className="text-sm font-semibold text-amber-600">{message}</p>}

      {review && (
        <Card className="gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Reviewing {review.skill.slug}</h2>
            <Button variant="secondary" size="sm" onClick={() => setReview(null)}>
              Close
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Provider: {review.org.name} · Licence: {review.version.manifest?.license ?? "-"}
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
                  <button
                    key={f.path}
                    onClick={() => setActiveFile(f.path)}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 font-mono text-xs",
                      f.path === (reviewFile?.path ?? "")
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {f.path}
                  </button>
                ))}
              </div>
              <CodeViewer content={reviewFile?.content ?? ""} maxHeightClass="max-h-96" />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="review-notes" className="text-sm font-medium">
              Reviewer notes (shown to the provider, kept as audit evidence)
            </label>
            <MarkdownEditor
              id="review-notes"
              value={notes}
              onChange={setNotes}
              placeholder="e.g. OpenAPI surface matches the declared protocols; rulebook covers revocation; approved."
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-brand"
                checked={official}
                onChange={(e) => setOfficial(e.target.checked)}
              />
              Mark as <b>Official</b> (endorsed by the marketplace operator) on approval
            </label>
            <div className="flex gap-2">
              <Button onClick={() => decide("approve")}>Approve & publish</Button>
              <Button variant="secondary" onClick={() => decide("request_changes")}>
                Request changes
              </Button>
              <Button variant="destructive" onClick={() => decide("reject")}>
                Reject
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="gap-3 p-6">
        <h2 className="font-medium">
          Awaiting review{" "}
          <span className="tabular-nums text-muted-foreground">({queue.length})</span>
        </h2>
        {queue.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2">Name</th>
                    <th>Type</th>
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Reviewer</th>
                    <th>Submitted</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageSlice(queue, page, PAGE).map((v) => (
                    <tr key={v.id} className="border-t border-border">
                      <td className="py-2.5 font-semibold">{v.slug}</td>
                      <td>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            v.type === "usecase"
                              ? "bg-brand/10 text-brand"
                              : "bg-secondary text-ink/70",
                          )}
                        >
                          {v.type === "usecase" ? "Use case" : "Skill"}
                        </span>
                      </td>
                      <td>{v.orgName}</td>
                      <td>
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="text-muted-foreground">{v.reviewerName ?? "-"}</td>
                      <td className="tabular-nums">{fmtDate(v.submittedAt)}</td>
                      <td className="text-right">
                        <Button
                          size="sm"
                          onClick={() =>
                            openReview(v.id, v.status).catch((e) => setMessage(e.message))
                          }
                        >
                          {v.status === "submitted" ? "Start review" : "Open"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE} total={queue.length} onPage={setPage} />
          </>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            The queue is empty - nothing awaiting review.
          </p>
        )}
      </Card>
    </DashboardMain>
  );
}
