"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { api, auth, fmtDate } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckList, type Check } from "@/components/check-list";
import { StatusBadge } from "@/components/status-badge";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ProviderSubmissionsPage() {
  const { denied } = useDashboardGuard("/provider/submissions", ["provider"]);
  const [skills, setSkills] = useState<any[]>([]);
  const [openChecks, setOpenChecks] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const s = await api("/api/skills/mine");
    setSkills(s.skills);
  }, []);

  async function delist(id: string, slug: string) {
    try {
      await api(`/api/skills/${id}/delist`, { method: "POST" });
      setMessage(`Delisted ${slug}. It has been removed from the marketplace.`);
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState happens after await
    if (auth.user?.role === "provider") load().catch((e) => setMessage(e.message));
  }, [load]);

  return (
    <DashboardMain
      title="My submissions"
      subtitle="Your skills and use cases, and their status through review."
      denied={denied}
    >
      {message && <p className="text-sm font-semibold text-brand">{message}</p>}
      {skills.length ? (
        skills.map((s) => (
          <Card key={s.id} className="gap-3 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">
                {s.slug}
                {s.type === "usecase" && (
                  <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                    Use case
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <StatusBadge status={s.status} />
                {s.status !== "delisted" && (
                  <Link
                    href={
                      s.type === "usecase" ? `/provider/submit?edit=${s.slug}` : "/provider/submit"
                    }
                    className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-ink transition-colors hover:bg-accent"
                  >
                    {s.type === "usecase" ? "Edit" : "New version"}
                  </Link>
                )}
                {s.status === "published" && (
                  <Button variant="destructive" size="sm" onClick={() => delist(s.id, s.slug)}>
                    Delist
                  </Button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2">Status</th>
                    <th>Submitted</th>
                    <th>Reviewer notes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {s.versions.map((v: any) => (
                    <Fragment key={v.id}>
                      <tr className="border-t border-border">
                        <td className="py-2.5">
                          <StatusBadge status={v.status} />
                        </td>
                        <td className="tabular-nums">{fmtDate(v.submittedAt)}</td>
                        <td className="max-w-xs text-muted-foreground">{v.reviewNotes ?? "-"}</td>
                        <td className="text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setOpenChecks(openChecks === v.id ? null : v.id)}
                          >
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
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
      )}
    </DashboardMain>
  );
}
