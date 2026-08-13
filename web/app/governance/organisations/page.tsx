"use client";

import { useCallback, useEffect, useState } from "react";
import { api, auth, fmtDate } from "@/lib/client";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function OrganisationsPage() {
  const { denied } = useDashboardGuard("/governance/organisations", ["superadmin"]);
  const [orgs, setOrgs] = useState<any[]>([]);

  const load = useCallback(async () => {
    const o = await api("/api/admin/orgs");
    setOrgs(o.orgs);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState after await
    if (auth.user?.role === "superadmin") load().catch((e) => toast.error(e.message));
  }, [load]);

  // Suspension takes the organisation and its published skills off the public
  // catalog and blocks publishing; "approved" reinstates everything.
  const setStatus = (o: any, status: "suspended" | "approved") => () =>
    api(`/api/admin/orgs/${o.id}`, { method: "PATCH", json: { status } })
      .then(() => {
        toast.success(status === "suspended" ? `Suspended ${o.name}` : `Reactivated ${o.name}`);
        return load();
      })
      .catch((e) => toast.error(e.message));

  return (
    <DashboardMain
      title="Organisations"
      subtitle="Provider organisations register instantly; only their skills go through review."
      denied={denied}
    >
      <DataTable
        columns={[
          {
            key: "name",
            header: "Name",
            render: (o: any) => <span className="font-semibold">{o.name}</span>,
            title: (o: any) => o.name,
          },
          {
            key: "status",
            header: "Status",
            width: 140,
            ellipsis: false,
            render: (o: any) => <StatusBadge status={o.status} />,
            title: (o: any) => o.status,
          },
          { key: "owner", header: "Owner", render: (o: any) => o.owner.name },
          {
            key: "created",
            header: "Created",
            width: 150,
            render: (o: any) => fmtDate(o.createdAt),
          },
          {
            key: "actions",
            width: 150,
            align: "right",
            ellipsis: false,
            render: (o: any) =>
              o.status === "approved" ? (
                <Button size="sm" variant="destructive" onClick={setStatus(o, "suspended")}>
                  Suspend
                </Button>
              ) : o.status === "suspended" ? (
                <Button size="sm" variant="secondary" onClick={setStatus(o, "approved")}>
                  Reactivate
                </Button>
              ) : null,
          },
        ]}
        rows={orgs}
        rowKey={(o: any) => o.id}
      />
    </DashboardMain>
  );
}
