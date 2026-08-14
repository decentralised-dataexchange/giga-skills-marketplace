"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  PlusCircle,
  Search,
} from "@/components/icons";
import { api, auth, fmtDate } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/tip";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { CheckList, type Check } from "@/components/check-list";
import { Drawer } from "@/components/drawer";
import { RepoCard, type RepoInfo } from "@/components/repo-card";
import { StatusBadge } from "@/components/status-badge";
import { TableFilter } from "@/components/table-filter";
import { toast } from "@/components/toast";
import { Notice } from "@/components/notice";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SourceView {
  id: string;
  url: string | null;
  status: "active" | "archived";
  skills: { id: string; slug: string; status: string; versions: any[] }[];
  submissions: { id: string; status: string; submittedAt: string }[];
}

const sourceLabel = (s: { url: string | null }) =>
  s.url ? s.url.replace(/^https?:\/\/(www\.)?github\.com\//i, "") : "Direct submissions";

const lastSubmitted = (s: SourceView) => s.submissions.at(-1)?.submittedAt ?? null;

export default function SkillSourcesPage() {
  return (
    <Suspense fallback={null}>
      <SkillSourcesInner />
    </Suspense>
  );
}

function SkillSourcesInner() {
  const { denied } = useDashboardGuard("/provider/submissions", ["provider"]);
  const params = useSearchParams();
  const [sources, setSources] = useState<SourceView[]>([]);
  const [org, setOrg] = useState<any>(null);

  const [openSourceId, setOpenSourceId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  // Active sources by default; the filter widens the view to archived ones.
  const [filter, setFilter] = useState<"all" | "active" | "archived">("active");
  const [auditVersion, setAuditVersion] = useState<{ title: string; checks: Check[] } | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishUrl, setPublishUrl] = useState("");

  const load = useCallback(async () => {
    const [s, o] = await Promise.all([api("/api/sources/mine"), api("/api/orgs/mine")]);
    setSources(s.sources);
    setOrg(o.orgs.find((x: any) => x.status === "approved") ?? null);
  }, []);

  useEffect(() => {
    if (auth.user?.role === "provider") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState happens after await
      load().catch((e) => toast.error(e.message, "Could not load your sources"));
    }
  }, [load]);

  // Deep links: /provider/submissions?publish=1&repo=... opens the publish drawer.
  useEffect(() => {
    if (params.get("publish") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot init from the URL
      setPublishOpen(true);
      const repo = params.get("repo");
      if (repo) setPublishUrl(repo);
    }
  }, [params]);

  const ordered = useMemo<SourceView[]>(
    () =>
      [...sources].sort((a, b) => (lastSubmitted(b) ?? "").localeCompare(lastSubmitted(a) ?? "")),
    [sources],
  );

  const visible = useMemo(
    () => ordered.filter((s) => filter === "all" || s.status === filter),
    [ordered, filter],
  );

  const openSource = ordered.find((s) => s.id === openSourceId) ?? null;

  // Archiving acts on the whole source in one call: the source record, every
  // published skill it carries, and any submission still waiting for review
  // come off together.
  async function archiveSource(source: SourceView) {
    try {
      const d = await api(`/api/sources/${source.id}/archive`, { method: "POST" });
      toast.success(
        `Archived ${sourceLabel(source)} - ${d.archived} published skill${
          d.archived === 1 ? "" : "s"
        } left the catalog and pending submissions were withdrawn from review. Resubmitting the source relists it through a fresh review.`,
      );
      setConfirmArchive(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e), "Could not archive the source");
    }
  }

  function openSourceDrawer(id: string | null) {
    setOpenSourceId(id);
    setConfirmArchive(false);
  }

  function startPublish(url?: string | null) {
    setPublishUrl(url ?? "");
    setPublishOpen(true);
  }

  return (
    <DashboardMain
      title="Skill Sources"
      subtitle="The GitHub repositories you publish from, and every skill they carry."
      denied={denied}
      actions={
        <Tip content="Publish a skill source">
          <Button
            aria-label="Publish a skill source"
            size="icon"
            variant="ghost"
            className="rounded-full text-ink hover:text-ink"
            onClick={() => startPublish()}
          >
            <PlusCircle className="size-7" aria-hidden="true" />
          </Button>
        </Tip>
      }
    >
      {ordered.length > 0 && (
        <div className="flex justify-end">
          <TableFilter
            label="Filter sources by status"
            value={filter}
            options={[
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
              { value: "all", label: "All statuses" },
            ]}
            onChange={setFilter}
          />
        </div>
      )}
      {visible.length ? (
        <DataTable
          columns={[
            {
              key: "source",
              header: "Source",
              render: (g: SourceView) => (
                <span className="font-mono text-[13px] font-semibold text-ink">
                  {sourceLabel(g)}
                </span>
              ),
              title: (g: SourceView) => sourceLabel(g),
            },
            {
              key: "skills",
              header: "Skills",
              width: 110,
              render: (g: SourceView) => g.skills.length,
            },
            {
              key: "status",
              header: "Status",
              width: 120,
              render: (g: SourceView) => <StatusBadge status={g.status} />,
            },
            {
              key: "last",
              header: "Last submitted",
              width: 160,
              render: (g: SourceView) => (
                <span className="text-muted-foreground">
                  {lastSubmitted(g) ? fmtDate(lastSubmitted(g)) : "-"}
                </span>
              ),
            },
          ]}
          rows={visible}
          rowKey={(g: SourceView) => g.id}
          minWidth={560}
          onRowClick={(g: SourceView) => openSourceDrawer(g.id)}
          rowTitle="Open this source"
        />
      ) : ordered.length ? (
        <p className="text-sm text-muted-foreground">
          No {filter} sources. Switch the filter to All statuses to see everything.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No sources yet. Use the + button to publish your first skill repository.
        </p>
      )}

      {/* Level 1: the source's skills */}
      {openSource && (
        <Drawer
          title={
            <span className="inline-flex items-center gap-2">
              {sourceLabel(openSource)}
              <StatusBadge status={openSource.status} />
            </span>
          }
          onClose={() => openSourceDrawer(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => openSourceDrawer(null)}>
                Close
              </Button>
              <div className="flex gap-2">
                {openSource.status === "active" &&
                  openSource.skills.some((skill) => skill.status === "published") &&
                  (confirmArchive ? (
                    <>
                      <Button variant="outline" onClick={() => setConfirmArchive(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={() => archiveSource(openSource)}>
                        Confirm archive
                      </Button>
                    </>
                  ) : (
                    <Button variant="destructive" onClick={() => setConfirmArchive(true)}>
                      Archive source
                    </Button>
                  ))}
                <Button onClick={() => startPublish(openSource.url)}>Submit update</Button>
              </div>
            </>
          }
        >
          {openSource.url && (
            <a
              href={openSource.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              {openSource.url}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
          {confirmArchive && (
            <Notice severity="warning">
              This removes every published skill in this source from the catalog in one action, and
              any submission still waiting for review is withdrawn from the queue. The review
              history stays public. Resubmitting the source relists it through a fresh review.
            </Notice>
          )}
          {openSource.status === "archived" && (
            <Notice severity="info">
              This source is archived: none of its skills appear in the catalog. Submit an update to
              relist it - approval brings every skill back.
            </Notice>
          )}
          {openSource.skills.map((skill) => (
            <section key={skill.id} className="rounded-lg border border-[#e0e0e0] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <Tip content={skill.slug}>
                  <span className="min-w-0 truncate text-sm font-semibold text-ink">
                    {skill.slug}
                  </span>
                </Tip>
                <StatusBadge status={skill.status} />
              </div>
              <ul className="mt-3 divide-y divide-border">
                {[...skill.versions].reverse().map((v: any) => (
                  <li key={v.id} className="py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-xs text-ink">v{v.version}</span>
                      <StatusBadge status={v.status} />
                      <span className="min-w-0 truncate text-xs tabular-nums text-muted-foreground">
                        {fmtDate(v.submittedAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setAuditVersion({
                            title: `${skill.slug} v${v.version} - audit checks`,
                            checks: (v.checks ?? []) as Check[],
                          })
                        }
                        className="ml-auto shrink-0 cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-brand hover:underline"
                      >
                        Audit checks
                      </button>
                    </div>
                    {v.reviewNotes && (
                      <Tip content={v.reviewNotes}>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          Notes: {v.reviewNotes}
                        </p>
                      </Tip>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </Drawer>
      )}

      {/* Level 2: one version's audit check report. The back chevron returns
          to the source drawer; the cross closes the whole stack. */}
      {auditVersion && (
        <Drawer
          title={auditVersion.title}
          depth={1}
          onBack={() => setAuditVersion(null)}
          onClose={() => {
            setAuditVersion(null);
            openSourceDrawer(null);
          }}
          footer={
            <Button variant="outline" onClick={() => setAuditVersion(null)}>
              Back
            </Button>
          }
        >
          <div className="rounded-lg border border-[#e0e0e0] bg-white p-4">
            <CheckList checks={auditVersion.checks} />
          </div>
        </Drawer>
      )}

      {/* Publish drawer, replacing the old /provider/submit page. Opened from
          inside a source drawer it stacks, with the back chevron returning. */}
      {publishOpen && (
        <PublishDrawer
          org={org}
          initialUrl={publishUrl}
          depth={openSource ? 1 : 0}
          onBack={openSource ? () => setPublishOpen(false) : undefined}
          onClose={() => {
            setPublishOpen(false);
            openSourceDrawer(null);
          }}
          onSubmitted={() => {
            load().catch((e) => toast.error(e.message, "Could not refresh your sources"));
          }}
        />
      )}
    </DashboardMain>
  );
}

interface InspectedSkill {
  dir: string;
  slug: string | null;
  description: string;
  version: string;
  checks: Check[];
  passed: boolean;
  fileCount: number;
  filePaths: string[];
  skippedFiles: string[];
  existing: boolean;
  conflict: boolean;
}

interface Inspection {
  repo: RepoInfo & { description: string; commit: string; ref: string };
  skills: InspectedSkill[];
}

/** A repository holding more skills than one submission allows: the provider
 * picks which directories to inspect. */
interface DirPick {
  dirs: string[];
  limit: number;
}

// The publish flow inside a drawer: name a repository, inspect it, pick the
// skills, submit for review.
function PublishDrawer({
  org,
  initialUrl,
  depth,
  onBack,
  onClose,
  onSubmitted,
}: {
  org: any;
  initialUrl: string;
  depth: number;
  onBack?: () => void;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [ref, setRef] = useState("");
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [dirPick, setDirPick] = useState<DirPick | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [dirFilter, setDirFilter] = useState("");
  const [openChecks, setOpenChecks] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  const [results, setResults] = useState<
    { dir: string; slug: string | null; status: string; version?: string; error?: string }[]
  >([]);

  async function inspect(dirs?: string[]) {
    setBusy(true);
    setInfo("");
    setResults([]);
    setInspection(null);
    if (!dirs) {
      setDirPick(null);
      setPicked(new Set());
      setDirFilter("");
    }
    try {
      const d = await api("/api/repos/inspect", {
        method: "POST",
        json: { url: url.trim(), ref: ref.trim() || undefined, dirs },
      });
      if (d.tooMany) {
        setDirPick({ dirs: d.dirs, limit: d.limit });
        setInfo(
          `This repository holds ${d.dirs.length} skills; one submission carries at most ${d.limit}. Pick the skills to inspect.`,
        );
        return;
      }
      // The results open in their own drawer, stacked over the form.
      setDirPick(null);
      setInfo("");
      setInspection(d as Inspection);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : String(err),
        "Could not inspect the repository",
      );
    } finally {
      setBusy(false);
    }
  }

  // The whole inspected source is submitted; per-skill results come back.
  async function submitSource() {
    if (!inspection || !inspection.skills.length) return;
    setBusy(true);
    setInfo("");
    try {
      const d = await api("/api/skills/from-repo", {
        method: "POST",
        json: {
          orgId: org.id,
          url: url.trim(),
          ref: inspection.repo.commit, // submit exactly what was inspected
          dirs: inspection.skills.map((s) => s.dir),
        },
      });
      setResults(d.results);
      setInspection(null);
      // The submission is all-or-nothing: reaching here means every skill went
      // in as one source submission, reviewed and decided as a whole.
      const ok = d.results.length;
      toast.success(
        `Submitted ${sourceLabel({ url: url.trim() })} as one source submission (${ok} skill${
          ok === 1 ? "" : "s"
        }), pinned to ${d.repo.commit.slice(0, 7)}. A reviewer decides it as a whole.`,
      );
      onSubmitted();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : String(err),
        "Could not submit the selection",
      );
    } finally {
      setBusy(false);
    }
  }

  const togglePicked = (dir: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });

  const visibleDirs = dirPick
    ? dirPick.dirs.filter((d) =>
        (d || "repository root").toLowerCase().includes(dirFilter.toLowerCase()),
      )
    : [];

  const closeResults = () => {
    setInspection(null);
    setResults([]);
  };

  return (
    <>
      <Drawer
        title="Publish skill source"
        depth={depth}
        onBack={onBack}
        onClose={onClose}
        footer={
          <>
            <Button variant="outline" onClick={onBack ?? onClose}>
              {onBack ? "Back" : "Close"}
            </Button>
            {dirPick ? (
              <Button
                disabled={busy || !picked.size || picked.size > dirPick.limit}
                onClick={() => inspect([...picked])}
              >
                {busy ? "Inspecting..." : `Inspect ${picked.size} selected`}
              </Button>
            ) : (
              <Button disabled={!org || !url.trim() || busy} onClick={() => inspect()}>
                {busy ? "Inspecting..." : "Inspect repository"}
              </Button>
            )}
          </>
        }
      >
        {!org ? (
          <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
            <p className="text-sm text-muted-foreground">
              You need a registered organisation before publishing.{" "}
              <Link
                href="/provider"
                className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
              >
                Register your organisation
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </p>
          </section>
        ) : (
          <>
            <section className="space-y-3 rounded-lg border border-[#e0e0e0] bg-white p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
                Source
              </h3>
              <div className="space-y-1.5">
                <label htmlFor="repo-url" className="text-sm font-medium text-ink">
                  Public GitHub repository
                </label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/your-org/skills"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    // A different source invalidates whatever was inspected.
                    setInspection(null);
                    setDirPick(null);
                    setResults([]);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="repo-ref" className="text-sm font-medium text-ink">
                  Commit, tag, or branch{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="repo-ref"
                  placeholder="default branch"
                  value={ref}
                  onChange={(e) => {
                    setRef(e.target.value);
                    setInspection(null);
                    setDirPick(null);
                    setResults([]);
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Every directory holding a SKILL.md becomes one skill. The submission is pinned to
                the resolved commit; submit the repository again at a new commit or tag to publish
                an update through a fresh review.
              </p>
            </section>

            {info && <Notice severity="info">{info}</Notice>}

            {dirPick && (
              <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
                    Pick skills to inspect
                  </h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {picked.size} / {dirPick.limit} selected
                  </span>
                </div>
                <div className="relative mt-3">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    aria-label="Filter skills"
                    placeholder="Filter skills..."
                    className="pl-8"
                    value={dirFilter}
                    onChange={(e) => setDirFilter(e.target.value)}
                  />
                </div>
                <ul className="mt-3 max-h-[45vh] space-y-1 overflow-y-auto">
                  {visibleDirs.map((dir) => {
                    const checked = picked.has(dir);
                    const full = picked.size >= dirPick.limit;
                    return (
                      <li key={dir || "(root)"}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded border border-border px-3 py-1.5 text-sm",
                            checked && "border-brand/40 bg-cyan-tint/40",
                            !checked && full && "cursor-not-allowed opacity-50",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-brand"
                            checked={checked}
                            disabled={!checked && full}
                            onChange={() => togglePicked(dir)}
                          />
                          <span className="min-w-0 flex-1 truncate font-mono text-xs">
                            {dir || "repository root"}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                  {!visibleDirs.length && (
                    <li className="py-4 text-center text-sm text-muted-foreground">
                      No skills match the filter.
                    </li>
                  )}
                </ul>
              </section>
            )}
          </>
        )}
      </Drawer>

      {/* Nested drawer: the discovered skills with their automated checks, and
        the publish action; after submission it shows the per-skill results. */}
      {(inspection || results.length > 0) && (
        <Drawer
          title={
            inspection
              ? `Discovered skills - ${inspection.repo.owner}/${inspection.repo.repo}`
              : "Submission results"
          }
          depth={depth + 1}
          onBack={closeResults}
          onClose={onClose}
          footer={
            <>
              <Button variant="outline" onClick={closeResults}>
                Back
              </Button>
              {inspection && (
                <Button disabled={busy || !inspection.skills.length} onClick={submitSource}>
                  {busy ? "Submitting..." : `Submit ${inspection.skills.length} for review`}
                </Button>
              )}
            </>
          }
        >
          {inspection && (
            <>
              <RepoCard repo={inspection.repo} />
              <section className="rounded-lg border border-brand/30 bg-cyan-tint/40 p-4">
                {/* Discovered skills only show their automated checks; the
                  source is submitted as a whole. */}
                <p className="text-sm font-semibold text-ink">
                  {inspection.skills.length} skill{inspection.skills.length === 1 ? "" : "s"}{" "}
                  discovered at {inspection.repo.ref} @ {inspection.repo.commit.slice(0, 7)} -
                  review the automated checks, then submit the source.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {inspection.skills.map((s) => {
                    const badge = s.conflict
                      ? "name already used by another of your sources"
                      : !s.passed
                        ? "checks failing"
                        : s.existing
                          ? "update to existing listing"
                          : "new listing";
                    const location = `${s.dir || "repository root"} · ${s.fileCount} ${
                      s.fileCount === 1 ? "file" : "files"
                    }`;
                    return (
                      <li key={s.dir} className="rounded border border-border bg-white">
                        <div className="flex items-center gap-2 px-3 py-2 text-sm">
                          <Tip content={s.slug ?? s.dir}>
                            <button
                              className="inline-flex min-w-0 shrink cursor-pointer items-center gap-1 border-none bg-transparent p-0 font-semibold text-ink"
                              onClick={() => setOpenChecks(openChecks === s.dir ? null : s.dir)}
                            >
                              {openChecks === s.dir ? (
                                <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
                              ) : (
                                <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                              )}
                              <span className="truncate">{s.slug ?? s.dir}</span>
                            </button>
                          </Tip>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            v{s.version}
                          </span>
                          <Tip content={badge}>
                            <span
                              className={cn(
                                "min-w-0 truncate rounded-full px-2 py-0.5 text-xs font-semibold",
                                s.conflict
                                  ? "bg-destructive/10 text-destructive"
                                  : !s.passed
                                    ? "bg-amber-100 text-amber-700"
                                    : s.existing
                                      ? "bg-brand/10 text-brand"
                                      : "bg-emerald-100 text-emerald-700",
                              )}
                            >
                              {badge}
                            </span>
                          </Tip>
                          <Tip content={location}>
                            <span className="ml-auto min-w-0 max-w-[40%] shrink-[2] truncate text-right text-xs text-muted-foreground">
                              {location}
                            </span>
                          </Tip>
                        </div>
                        {openChecks === s.dir && (
                          <div className="border-t border-border px-3 py-2">
                            <CheckList checks={s.checks} />
                            {s.skippedFiles.length > 0 && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Left out: {s.skippedFiles.join(", ")}
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          )}

          {results.length > 0 && (
            <section className="rounded-lg border border-[#e0e0e0] bg-white p-4">
              <p className="text-sm font-semibold text-ink">Submission results</p>
              <ul className="mt-2 space-y-1">
                {results.map((r) => (
                  <li key={r.dir} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink">{r.slug ?? r.dir}</span>
                    <span
                      className={
                        "text-xs font-semibold " +
                        (r.status === "submitted"
                          ? "text-emerald-600"
                          : r.status === "checks_failed"
                            ? "text-amber-600"
                            : "text-destructive")
                      }
                    >
                      {r.status === "submitted"
                        ? "Submitted for review"
                        : r.status === "checks_failed"
                          ? "Automated checks failed"
                          : (r.error ?? "Error")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </Drawer>
      )}
    </>
  );
}
