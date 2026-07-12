"use client";

import { useEffect, useState } from "react";
import { api, auth } from "@/lib/client";
import { Card } from "@/components/ui/card";
import { Pagination, pageSlice } from "@/components/pagination";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PAGE = 15;

export default function AuditPage() {
  const { denied } = useDashboardGuard("/governance/audit", ["reviewer", "superadmin"]);
  const [events, setEvents] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (auth.user && ["reviewer", "superadmin"].includes(auth.user.role)) {
      api("/api/admin/events").then((d) => setEvents(d.events)).catch((e) => setMessage(e.message));
    }
  }, []);

  return (
    <DashboardMain title="Audit trail" subtitle="Every governance action, retained as audit evidence." denied={denied}>
      {message && <p className="text-sm font-semibold text-amber-600">{message}</p>}
      <Card className="gap-3 p-6">
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2">When</th><th>Event</th><th>Actor</th><th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice(events, page, PAGE).map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="whitespace-nowrap py-2 tabular-nums">{new Date(e.at).toLocaleString()}</td>
                <td>{e.type}</td>
                <td>{e.actor.name}</td>
                <td className="max-w-md truncate font-mono text-xs text-muted-foreground">{JSON.stringify(e.detail ?? {})}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <Pagination page={page} pageSize={PAGE} total={events.length} onPage={setPage} />
      </Card>
    </DashboardMain>
  );
}
