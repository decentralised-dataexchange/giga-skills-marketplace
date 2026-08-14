"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ExternalLink, Eye } from "@/components/icons";
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
import { manifestProtocols } from "@/lib/views";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PAGE = 10;

// The queue lists source submissions: one row per publish action, decided as
// a whole. The skills inside open one level deeper, each with the snapshot
// taken when the source was submitted.

const sourceLabel = (source: { url?: string | null } | null | undefined) =>
  source?.url ? source.url.replace(/^https?:\/\/(www\.)?github\.com\//i, "") : "Direct submissions";

interface SubmissionSkill {
  skill: { id: string; slug: string; orgId: string; status: string };
  version: any;
}

interface SubmissionDetail {
  submission: any;
  source: any;
  org: any;
  skills: SubmissionSkill[];
}

function checkTotals(skills: SubmissionSkill[]) {
  let fails = 0;
  let warns = 0;
  for (const s of skills) {
    for (const c of (s.version.checks ?? []) as Check[]) {
      if (c.status === "fail") fails++;
      else if (c.status === "warn") warns++;
    }
  }
  return { fails, warns };
}

const skillPill = (checks: Check[]) =>
  checks.some((c) => c.status === "fail")
    ? ({ label: "checks failing", cls: "bg-red-100 text-red-700" } as const)
    : checks.some((c) => c.status === "warn")
      ? ({ label: "warnings", cls: "bg-amber-100 text-amber-700" } as const)
      : ({ label: "checks pass", cls: "bg-emerald-100 text-emerald-700" } as const);

export default function ReviewQueuePage() {
  const { denied } = useDashboardGuard("/governance/review", ["reviewer", "superadmin"]);
  const [queue, setQueue] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [review, setReview] = useState<SubmissionDetail | null>(null);
  const [openSkillIdx, setOpenSkillIdx] = useState<number | null>(null);
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
  // inside the pane. One fetch carries every skill's snapshot.
  async function openReview(submissionId: string) {
    const r = await api(`/api/submissions/${submissionId}`);
    setReview(r);
    setOpenSkillIdx(null);
    setNotes("");
  }

  function closeReview() {
    setReview(null);
    setOpenSkillIdx(null);
  }

  async function claim() {
    if (!review) return;
    try {
      await api(`/api/review/submissions/${review.submission.id}/claim`, { method: "POST" });
      toast.success(`Started review of ${sourceLabel(review.source)}.`);
      await openReview(review.submission.id);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e), "Could not start the review");
    }
  }

  async function decide(decision: string) {
    if (!review) return;
    if (decision !== "approve" && !notes.trim()) {
      toast.error("Add reviewer notes so the provider knows what to fix.", "Notes required");
      return;
    }
    const n = review.skills.length;
    const skillCount = `${n} skill${n === 1 ? "" : "s"}`;
    try {
      await api(`/api/review/submissions/${review.submission.id}/decision`, {
        method: "POST",
        json: { decision, notes },
      });
      toast.success(
        decision === "approve"
          ? `Approved ${sourceLabel(review.source)} - ${skillCount} published.`
          : decision === "reject"
            ? `Rejected the whole submission (${skillCount}).`
            : `Requested changes on the whole submission (${skillCount}).`,
      );
      closeReview();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e), "Could not record the decision");
    }
  }

  const openSkill = review && openSkillIdx !== null ? review.skills[openSkillIdx] : null;
  const openSkillFiles: { path: string; content: string }[] = openSkill?.version.files ?? [];
  const openSkillFile = openSkillFiles.find((f) => f.path === activeFile) ?? openSkillFiles[0];

  // Decisions belong to the claimant; a super admin may decide anything.
  const claimantName = queue.find((s) => s.id === review?.submission.id)?.reviewerName ?? null;
  const canDecide =
    auth.user?.role === "superadmin" ||
    (review?.submission.status === "in_review" && review?.submission.reviewerId === auth.user?.id);

  const totals = review ? checkTotals(review.skills) : { fails: 0, warns: 0 };

  return (
    <DashboardMain
      title="Review queue"
      subtitle="Review a skill source as a whole: inspect every skill's snapshot, then record one decision."
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
              <span className="truncate">Reviewing {sourceLabel(review.source)}</span>
              <StatusBadge status={review.submission.status} />
            </span>
          }
          width={860}
          onClose={closeReview}
          footer={
            <>
              <Button variant="outline" onClick={closeReview}>
                Close
              </Button>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {review.submission.status === "submitted" && !canDecide ? (
                  <Button onClick={claim}>Start review</Button>
                ) : (
                  <>
                    <Button
                      variant="destructive"
                      disabled={!canDecide}
                      onClick={() => decide("reject")}
                    >
                      Reject all
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={!canDecide}
                      onClick={() => decide("request_changes")}
                    >
                      Request changes
                    </Button>
                    <Button disabled={!canDecide} onClick={() => decide("approve")}>
                      Approve & publish all
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
              Source submission
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
                  Source
                </dt>
                <dd className="mt-0.5 text-sm text-ink">
                  {review.source.url ? (
                    <a
                      href={review.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-w-0 items-center gap-1 font-semibold text-brand hover:underline"
                    >
                      <span className="truncate">{sourceLabel(review.source)}</span>
                      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  ) : (
                    sourceLabel(review.source)
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Skills
                </dt>
                <dd className="mt-0.5 text-sm tabular-nums text-ink">{review.skills.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reviewer
                </dt>
                <dd className="mt-0.5 text-sm text-ink">
                  {review.submission.status === "in_review" ? (claimantName ?? "You") : "-"}
                </dd>
              </div>
            </dl>
            {!canDecide && (
              <Notice severity="info" className="mt-3">
                {review.submission.status === "submitted"
                  ? "Start the review to record a decision. The decision covers every skill in this submission."
                  : "Another reviewer has started this review."}
              </Notice>
            )}
          </section>

          {review.submission.repo && (
            <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
                Source repository (snapshot at submission)
              </h3>
              <RepoCard repo={review.submission.repo} />
            </section>
          )}

          <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
              Skills in this submission
            </h3>
            <p className="mb-3 text-sm text-muted-foreground">
              {review.skills.length} skill{review.skills.length === 1 ? "" : "s"} · {totals.fails}{" "}
              failing check{totals.fails === 1 ? "" : "s"} · {totals.warns} warning
              {totals.warns === 1 ? "" : "s"} across the source. Open a skill to inspect its
              snapshot; the decision below covers all of them.
            </p>
            <ul className="space-y-1.5">
              {review.skills.map((s, i) => {
                const checks = (s.version.checks ?? []) as Check[];
                const pill = skillPill(checks);
                return (
                  <li key={s.skill.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenSkillIdx(i);
                        setActiveFile("SKILL.md");
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 rounded border border-border bg-white px-3 py-2 text-left text-sm hover:border-brand/40 hover:bg-cyan-tint/30"
                    >
                      <span className="min-w-0 truncate font-mono text-[13px] font-semibold text-ink">
                        {s.skill.slug}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        v{s.version.version}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                          pill.cls,
                        )}
                      >
                        {pill.label}
                      </span>
                      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                        {s.version.fileCount} file{s.version.fileCount === 1 ? "" : "s"}
                      </span>
                      <ChevronRight
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
              Decision (whole source)
            </h3>
            <label htmlFor="review-notes" className="text-sm font-medium">
              Reviewer notes (shown to the provider, kept as audit evidence)
            </label>
            <div className="mt-2">
              <MarkdownEditor
                id="review-notes"
                value={notes}
                onChange={setNotes}
                placeholder="e.g. OpenAPI surfaces match the declared protocols; rulebooks cover revocation; approved."
              />
            </div>
          </section>
        </Drawer>
      )}

      {/* Level 2: one skill's snapshot. The back chevron returns to the source
          submission; the cross closes the whole stack. */}
      {review && openSkill && (
        <Drawer
          title={
            <span className="flex min-w-0 items-center gap-3">
              <span className="truncate">
                {openSkill.skill.slug} v{openSkill.version.version}
              </span>
              <StatusBadge status={openSkill.version.status} />
            </span>
          }
          depth={1}
          width={860}
          onBack={() => setOpenSkillIdx(null)}
          onClose={closeReview}
          footer={
            <Button variant="outline" onClick={() => setOpenSkillIdx(null)}>
              Back
            </Button>
          }
        >
          <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
              Snapshot at submission
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Licence
                </dt>
                <dd className="mt-0.5 text-sm text-ink">
                  {openSkill.version.manifest?.license ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Version
                </dt>
                <dd className="mt-0.5 text-sm text-ink">{openSkill.version.version}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Protocols
                </dt>
                <dd className="mt-0.5 text-sm text-ink">
                  {manifestProtocols(openSkill.version.manifest).join(", ") || "-"}
                </dd>
              </div>
            </dl>
            {openSkill.version.manifest?.description && (
              <p className="mt-3 text-sm text-muted-foreground">
                {String(openSkill.version.manifest.description)}
              </p>
            )}
          </section>

          <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
              Automated check report
            </h3>
            {/* Long reports scroll instead of stretching the drawer. */}
            <div className="max-h-80 overflow-y-auto pr-1">
              <CheckList checks={(openSkill.version.checks ?? []) as Check[]} />
            </div>
          </section>

          <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
              Bundle files
            </h3>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {openSkillFiles.map((f) => (
                <button
                  key={f.path}
                  onClick={() => setActiveFile(f.path)}
                  className={cn(
                    "cursor-pointer rounded-md border-none px-2.5 py-1.5 font-mono text-xs",
                    f.path === (openSkillFile?.path ?? "")
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {f.path}
                </button>
              ))}
            </div>
            <CodeViewer content={openSkillFile?.content ?? ""} maxHeightClass="max-h-96" />
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
                key: "source",
                header: "Source",
                render: (s: any) => (
                  <span className="font-mono text-[13px] font-semibold text-ink">
                    {sourceLabel(s.source)}
                  </span>
                ),
                title: (s: any) => (s.slugs ?? []).join(", ") || sourceLabel(s.source),
              },
              {
                key: "provider",
                header: "Provider",
                width: 160,
                render: (s: any) => s.orgName,
              },
              {
                key: "skills",
                header: "Skills",
                width: 90,
                render: (s: any) => <span className="tabular-nums">{s.skillCount}</span>,
              },
              {
                key: "status",
                header: "Status",
                width: 150,
                ellipsis: false,
                render: (s: any) => <StatusBadge status={s.status} />,
              },
              {
                key: "reviewer",
                header: "Reviewer",
                width: 150,
                render: (s: any) => (
                  <span className="text-muted-foreground">{s.reviewerName ?? "-"}</span>
                ),
                title: (s: any) => s.reviewerName ?? undefined,
              },
              {
                key: "submitted",
                header: "Submitted",
                width: 150,
                render: (s: any) => fmtDate(s.submittedAt),
              },
              {
                key: "actions",
                width: 72,
                align: "right",
                ellipsis: false,
                render: (s: any) => (
                  <Tip content="Open review">
                    <button
                      type="button"
                      aria-label={`Open review of ${sourceLabel(s.source)}`}
                      onClick={() => openReview(s.id).catch((e) => toast.error(e.message))}
                      className="grid size-8 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-brand transition-colors hover:bg-brand/10"
                    >
                      <Eye className="size-5" aria-hidden="true" />
                    </button>
                  </Tip>
                ),
              },
            ]}
            rows={pageSlice(queue, page, PAGE)}
            rowKey={(s: any) => s.id}
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
