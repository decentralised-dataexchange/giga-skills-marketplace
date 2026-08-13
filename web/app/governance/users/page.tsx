"use client";

import { useCallback, useEffect, useState } from "react";
import { api, auth, fmtDate } from "@/lib/client";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";
import { ASSIGNABLE_ROLES } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PAGE = 12;

export default function UsersPage() {
  const { user, denied } = useDashboardGuard("/governance/users", ["superadmin"]);
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const u = await api(`/api/admin/users?page=${page}&pageSize=${PAGE}`);
    setUsers(u.users);
    setTotal(u.total);
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState after await
    if (auth.user?.role === "superadmin") load().catch((e) => toast.error(e.message));
  }, [load]);

  const act = (fn: () => Promise<unknown>) => () =>
    fn()
      .then(load)
      .catch((e) => toast.error(e.message));

  return (
    <DashboardMain
      title="Users & roles"
      subtitle="Governance roles are granted here; they can never be self-assigned at registration."
      denied={denied}
    >
      <DataTable
        columns={[
          {
            key: "name",
            header: "Name",
            render: (u: any) => (
              <>
                {u.name}
                {u.id === user?.id && (
                  <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                )}
              </>
            ),
            title: (u: any) => u.name,
          },
          {
            key: "email",
            header: "Email",
            render: (u: any) => <span className="text-muted-foreground">{u.email}</span>,
            title: (u: any) => u.email,
          },
          {
            key: "role",
            header: "Role",
            width: 160,
            ellipsis: false,
            render: (u: any) =>
              u.id === user?.id ? (
                <StatusBadge status={u.role} />
              ) : (
                <Select
                  value={u.role}
                  onValueChange={(role) =>
                    role &&
                    act(() =>
                      api(`/api/admin/users/${u.id}/role`, {
                        method: "POST",
                        json: { role },
                      }),
                    )()
                  }
                >
                  <SelectTrigger size="sm" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ),
          },
          {
            key: "status",
            header: "Status",
            width: 130,
            ellipsis: false,
            render: (u: any) => <StatusBadge status={u.status} />,
          },
          {
            key: "joined",
            header: "Joined",
            width: 150,
            render: (u: any) => fmtDate(u.createdAt),
          },
          {
            key: "actions",
            width: 150,
            align: "right",
            ellipsis: false,
            render: (u: any) =>
              u.id !== user?.id && (
                <Button
                  size="sm"
                  variant={u.status === "active" ? "destructive" : "secondary"}
                  onClick={act(() =>
                    api(`/api/admin/users/${u.id}/status`, {
                      method: "POST",
                      json: { status: u.status === "active" ? "suspended" : "active" },
                    }),
                  )}
                >
                  {u.status === "active" ? "Suspend" : "Reactivate"}
                </Button>
              ),
          },
        ]}
        rows={users}
        rowKey={(u: any) => u.id}
        pagination={{ page, pageSize: PAGE, total, onPage: setPage }}
      />
    </DashboardMain>
  );
}
