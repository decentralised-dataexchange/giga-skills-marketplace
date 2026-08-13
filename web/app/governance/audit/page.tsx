"use client";

import { useEffect, useState } from "react";
import { api, auth } from "@/lib/client";
import { toast } from "@/components/toast";
import { describeEvent, eventLabel } from "@/lib/events";
import { pageSlice } from "@/components/pagination";
import { DataTable } from "@/components/data-table";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PAGE = 15;

export default function AuditPage() {
  const { denied } = useDashboardGuard("/governance/audit", ["reviewer", "superadmin"]);
  const [events, setEvents] = useState<any[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (auth.user && ["reviewer", "superadmin"].includes(auth.user.role)) {
      api("/api/admin/events")
        .then((d) => setEvents(d.events))
        .catch((e) => toast.error(e.message));
    }
  }, []);

  return (
    <DashboardMain
      title="Audit trail"
      subtitle="Every governance action, retained as audit evidence."
      denied={denied}
    >
      <DataTable
        columns={[
          {
            key: "when",
            header: "When",
            width: 200,
            render: (e: any) =>
              new Date(e.at).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
            title: (e: any) => new Date(e.at).toLocaleString(),
          },
          // The stored event stays JSON; people read sentences. The raw
          // payload remains one hover away.
          {
            key: "event",
            header: "Event",
            width: 200,
            render: (e: any) => eventLabel(e.type),
            title: (e: any) => e.type,
          },
          { key: "actor", header: "Actor", width: 180, render: (e: any) => e.actor.name },
          {
            key: "detail",
            header: "Detail",
            render: (e: any) => describeEvent(e.type, e.detail),
            title: (e: any) => describeEvent(e.type, e.detail),
          },
        ]}
        rows={pageSlice(events, page, PAGE)}
        rowKey={(e: any) => e.id}
        pagination={{ page, pageSize: PAGE, total: events.length, onPage: setPage }}
      />
    </DashboardMain>
  );
}
