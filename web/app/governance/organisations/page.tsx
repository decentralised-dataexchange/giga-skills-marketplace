"use client";

import { useCallback, useEffect, useState } from "react";
import { api, auth, fmtDate } from "@/lib/client";
import { toast } from "@/components/toast";
import { DataTable } from "@/components/data-table";
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
            render: (o: any) => <span className="capitalize">{o.status}</span>,
            title: (o: any) => o.status,
          },
          { key: "owner", header: "Owner", render: (o: any) => o.owner.name },
          {
            key: "created",
            header: "Created",
            width: 150,
            render: (o: any) => fmtDate(o.createdAt),
          },
        ]}
        rows={orgs}
        rowKey={(o: any) => o.id}
      />
    </DashboardMain>
  );
}
