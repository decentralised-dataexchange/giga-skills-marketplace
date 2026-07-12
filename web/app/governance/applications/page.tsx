"use client";

import { useCallback, useEffect, useState } from "react";
import { api, auth, fmtDate } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Pagination, pageSlice } from "@/components/pagination";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PAGE = 10;

export default function ApplicationsModerationPage() {
  const { denied } = useDashboardGuard("/governance/applications", ["reviewer", "superadmin"]);
  const [apps, setApps] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const a = await api("/api/admin/applications");
    setApps(a.applications);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState after await
    if (auth.user && ["reviewer", "superadmin"].includes(auth.user.role)) load().catch((e) => setMessage(e.message));
  }, [load]);

  const act = (fn: () => Promise<unknown>) => () => fn().then(load).catch((e) => setMessage(e.message));

  return (
    <DashboardMain title="Applications" subtitle="Moderate developer showcase submissions." denied={denied}>
      {message && <p className="text-sm font-semibold text-amber-600">{message}</p>}
      <Card className="gap-3 p-6">
        <h2 className="font-medium">Showcase applications <span className="tabular-nums text-muted-foreground">({apps.length})</span></h2>
        {apps.length ? (
          <>
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Title</th><th>Developer</th><th>Uses</th><th>Status</th><th>Submitted</th><th />
                </tr>
              </thead>
              <tbody>
                {pageSlice(apps, page, PAGE).map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="py-2.5 font-semibold text-ink">{a.title}</td>
                    <td className="text-muted-foreground">{a.developer.name}</td>
                    <td className="text-muted-foreground">{[...a.usecases, ...a.skills].join(", ") || "-"}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="tabular-nums">{fmtDate(a.createdAt)}</td>
                    <td className="text-right">
                      <Button size="sm" variant={a.status === "published" ? "destructive" : "secondary"}
                        onClick={act(() => api(`/api/applications/${a.id}/status`,
                          { method: "POST", json: { status: a.status === "published" ? "delisted" : "published" } }))}>
                        {a.status === "published" ? "Delist" : "Restore"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <Pagination page={page} pageSize={PAGE} total={apps.length} onPage={setPage} />
          </>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">No applications submitted yet.</p>
        )}
      </Card>
    </DashboardMain>
  );
}
