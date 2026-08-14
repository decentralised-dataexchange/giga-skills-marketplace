"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye } from "@/components/icons";
import { api, auth, fmtDate } from "@/lib/client";
import { Tip } from "@/components/tip";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarkdownEditor } from "@/components/markdown-editor";
import { CheckList, type Check } from "@/components/check-list";
import { CodeViewer } from "@/components/code-viewer";
import { Drawer } from "@/components/drawer";
import { RepoCard } from "@/components/repo-card";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { pageSlice } from "@/components/pagination";
import { Notice } from "@/components/notice";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PAGE = 10;

export default function ReviewQueuePage() {
  const { denied } = useDashboardGuard("/governance/review", ["reviewer", "superadmin"]);
  const [queue, setQueue] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [review, setReview] = useState<any>(null);
  const [activeFile, setActiveFile] = useState("SKILL.md");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const q = await api("/api/review/queue");
    setQueue(q.queue);
    // Marketplace metrics headline the queue (the former Overview page).
    api("/api/admin/stats")
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (auth.user && ["reviewer", "superadmin"].includes(auth.user.role)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState after await
      load().catch((e) => toast.error(e.message));
    }
  }, [load]);

  // Opening is side-effect free inspection; claiming is an explicit action
  // inside the pane.
  async function openReview(versionId: string) {
    const r = await api(`/api/versions/${versionId}`);
    setReview(r);
    setActiveFile("SKILL.md");
    setNotes("");
  }

  async function claim() {
    try {
      await api(`/api/review/versions/${review.version.id}/claim`, { method: "POST" });
      toast.success(`Started review of ${review.skill?.slug ?? "the submission"}.`);
      await openReview(review.version.id);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e), "Could not start the review");
    }
  }

  async function decide(decision: string) {
    if (decision !== "approve" && !notes.trim()) {
      toast.error("Add reviewer notes so the provider knows what to fix.", "Notes required");
      return;
    }
    try {
      await api(`/api/review/versions/${review.version.id}/decision`, {
        method: "POST",
        json: { decision, notes },
      });
      toast.success(
        decision === "approve"
          ? `Approved ${review.skill?.slug ?? "the skill"} for publication.`
          : decision === "reject"
            ? "Rejected the submission."
            : "Requested changes from the provider.",
      );
      setReview(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e), "Could not record the decision");
    }
  }

  const reviewFile =
    review?.version.files.find((f: any) => f.path === activeFile) ?? review?.version.files[0];

  // Decisions belong to the claimant; a super admin may decide anything.
  const claimantName = queue.find((v) => v.id === review?.version.id)?.reviewerName ?? null;
  const canDecide =
    auth.user?.role === "superadmin" ||
    (review?.version.status === "in_review" && review?.version.reviewerId === auth.user?.id);

  return (
    <DashboardMain
      title="Review queue"
      subtitle="Start a review, inspect the bundle and checks, and record a decision."
      denied={denied}
    >
      {/* Marketplace metrics, in the NXD stat-tile treatment */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
          {(
            [
              [stats.skillsByStatus.published ?? 0, "Published skills"],
              [stats.reviewQueue, "In review queue"],
              [stats.orgsByStatus.approved ?? 0, "Provider organisations"],
              [stats.usersByRole.provider ?? 0, "Provider accounts"],
            ] as [number, string][]
          ).map(([n, label]) => (
            <Card key={label} className="gap-0.5 px-4 py-3 text-center">
              <span className="text-[22px] font-bold leading-tight tabular-nums text-[#1d1d1f]">
                {n}
              </span>
              <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.66px] text-[#86868b]">
                {label}
              </span>
            </Card>
          ))}
        </div>
      )}
      {/* The review opens in a side drawer over the queue. */}
      {review && (
        <Drawer
          title={
            <span className="flex min-w-0 items-center gap-3">
              <span className="truncate">Reviewing {review.skill.slug}</span>
              <StatusBadge status={review.version.status} />
            </span>
          }
          width={860}
          onClose={() => setReview(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setReview(null)}>
                Close
              </Button>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {review.version.status === "submitted" && !canDecide ? (
                  <Button onClick={claim}>Start review</Button>
                ) : (
                  <>
                    <Button
                      variant="destructive"
                      disabled={!canDecide}
                      onClick={() => decide("reject")}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={!canDecide}
                      onClick={() => decide("request_changes")}
                    >
                      Request changes
                    </Button>
                    <Button disabled={!canDecide} onClick={() => decide("approve")}>
                      Approve & publish
                    </Button>
                  </>
                )}
              </div>
            </>
          }
        >
          {/* Submission facts, label over value */}
          <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
              Submission
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Provider
                </dt>
                <dd className="mt-0.5 text-sm text-ink">{review.org.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Licence
                </dt>
                <dd className="mt-0.5 text-sm text-ink">
                  {review.version.manifest?.license ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Version
                </dt>
                <dd className="mt-0.5 text-sm text-ink">{review.version.version}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reviewer
                </dt>
                <dd className="mt-0.5 text-sm text-ink">
                  {review.version.status === "in_review" ? (claimantName ?? "You") : "-"}
                </dd>
              </div>
            </dl>
            {!canDecide && (
              <Notice severity="info" className="mt-3">
                {review.version.status === "submitted"
                  ? "Start the review to record a decision."
                  : "Another reviewer has started this review."}
              </Notice>
            )}
          </section>

          {review.version.repo && (
            <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
                Source repository
              </h3>
              <RepoCard repo={review.version.repo} />
            </section>
          )}

          <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
              Automated check report
            </h3>
            {/* Long reports scroll instead of stretching the drawer. */}
            <div className="max-h-80 overflow-y-auto pr-1">
              <CheckList checks={review.version.checks as Check[]} />
            </div>
          </section>

          <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
              Bundle files
            </h3>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {review.version.files.map((f: any) => (
                <button
                  key={f.path}
                  onClick={() => setActiveFile(f.path)}
                  className={cn(
                    "cursor-pointer rounded-md border-none px-2.5 py-1.5 font-mono text-xs",
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
          </section>

          <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
              Decision
            </h3>
            <label htmlFor="review-notes" className="text-sm font-medium">
              Reviewer notes (shown to the provider, kept as audit evidence)
            </label>
            <div className="mt-2">
              <MarkdownEditor
                id="review-notes"
                value={notes}
                onChange={setNotes}
                placeholder="e.g. OpenAPI surface matches the declared protocols; rulebook covers revocation; approved."
              />
            </div>
          </section>
        </Drawer>
      )}

      <div className="space-y-3">
        <h2 className="font-medium">
          Awaiting review{" "}
          <span className="tabular-nums text-muted-foreground">({queue.length})</span>
        </h2>
        {queue.length ? (
          <DataTable
            columns={[
              {
                key: "name",
                header: "Name",
                render: (v: any) => <span className="font-semibold">{v.slug}</span>,
                title: (v: any) => v.slug,
              },
              {
                key: "provider",
                header: "Provider",
                width: 160,
                render: (v: any) => v.orgName,
              },
              {
                key: "status",
                header: "Status",
                width: 150,
                ellipsis: false,
                render: (v: any) => <StatusBadge status={v.status} />,
              },
              {
                key: "reviewer",
                header: "Reviewer",
                width: 150,
                render: (v: any) => (
                  <span className="text-muted-foreground">{v.reviewerName ?? "-"}</span>
                ),
                title: (v: any) => v.reviewerName ?? undefined,
              },
              {
                key: "submitted",
                header: "Submitted",
                width: 150,
                render: (v: any) => fmtDate(v.submittedAt),
              },
              {
                key: "actions",
                width: 72,
                align: "right",
                ellipsis: false,
                render: (v: any) => (
                  <Tip content="Open review">
                    <button
                      type="button"
                      aria-label={`Open review of ${v.slug}`}
                      onClick={() => openReview(v.id).catch((e) => toast.error(e.message))}
                      className="grid size-8 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-brand transition-colors hover:bg-brand/10"
                    >
                      <Eye className="size-5" aria-hidden="true" />
                    </button>
                  </Tip>
                ),
              },
            ]}
            rows={pageSlice(queue, page, PAGE)}
            rowKey={(v: any) => v.id}
            pagination={{ page, pageSize: PAGE, total: queue.length, onPage: setPage }}
          />
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            The queue is empty - nothing awaiting review.
          </p>
        )}
      </div>
    </DashboardMain>
  );
}
