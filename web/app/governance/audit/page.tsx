"use client";

import { useEffect, useMemo, useState } from "react";
import { api, auth } from "@/lib/client";
import { toast } from "@/components/toast";
import { describeEvent, eventLabel } from "@/lib/events";
import { pageSlice } from "@/components/pagination";
import { DataTable } from "@/components/data-table";
import { TableFilter } from "@/components/table-filter";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PAGE = 15;

// Events carry a dotted type; the filter groups them by prefix, so legacy
// types (e.g. skill.delisted from before the archive rename) land in the same
// category as their successors. seed.completed and unknown types appear only
// under All.
const CATEGORIES: Record<string, { label: string; prefixes: string[] }> = {
  all: { label: "All events", prefixes: [] },
  reviews: { label: "Reviews", prefixes: ["review."] },
  skills: { label: "Skills & sources", prefixes: ["skill.", "source."] },
  accounts: { label: "Accounts", prefixes: ["user."] },
  orgs: { label: "Organisations", prefixes: ["org."] },
};

export default function AuditPage() {
  const { denied } = useDashboardGuard("/governance/audit", ["reviewer", "superadmin"]);
  const [events, setEvents] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<keyof typeof CATEGORIES>("all");

  useEffect(() => {
    if (auth.user && ["reviewer", "superadmin"].includes(auth.user.role)) {
      api("/api/admin/events")
        .then((d) => setEvents(d.events))
        .catch((e) => toast.error(e.message));
    }
  }, []);

  const filtered = useMemo(() => {
    const { prefixes } = CATEGORIES[category];
    if (!prefixes.length) return events;
    return events.filter((e) => prefixes.some((p) => String(e.type).startsWith(p)));
  }, [events, category]);

  return (
    <DashboardMain
      title="Audit trail"
      subtitle="Every governance action, retained as audit evidence."
      denied={denied}
    >
      <div className="flex justify-end">
        <TableFilter
          label="Filter events by category"
          value={category}
          options={Object.entries(CATEGORIES).map(([value, c]) => ({
            value: value as keyof typeof CATEGORIES,
            label: c.label,
          }))}
          onChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
        />
      </div>
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
        rows={pageSlice(filtered, page, PAGE)}
        rowKey={(e: any) => e.id}
        pagination={{ page, pageSize: PAGE, total: filtered.length, onPage: setPage }}
      />
      {events.length > 0 && filtered.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No events in this category (newest 200 shown).
        </p>
      )}
    </DashboardMain>
  );
}
