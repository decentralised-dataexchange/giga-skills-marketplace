"use client";

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
  const [openChecks, setOpenChecks] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const s = await api("/api/skills/mine");
    setSkills(s.skills);
  }, []);

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
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {s.slug}
                {s.type === "usecase" && (
                  <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                    Use case
                  </span>
                )}
              </span>
              <StatusBadge status={s.status} />
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
