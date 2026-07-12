"use client";

import { useCallback, useEffect, useState } from "react";
import { api, auth, fmtDate } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { Pagination, pageSlice } from "@/components/pagination";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROLES = ["builder", "provider", "reviewer", "superadmin"];
const PAGE = 12;

export default function UsersPage() {
  const { user, denied } = useDashboardGuard("/governance/users", ["superadmin"]);
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const u = await api("/api/admin/users");
    setUsers(u.users);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState after await
    if (auth.user?.role === "superadmin") load().catch((e) => setMessage(e.message));
  }, [load]);

  const act = (fn: () => Promise<unknown>) => () => fn().then(load).catch((e) => setMessage(e.message));

  return (
    <DashboardMain title="Users & roles" subtitle="Governance roles are granted here; they can never be self-assigned at registration." denied={denied}>
      {message && <p className="text-sm font-semibold text-amber-600">{message}</p>}
      <Card className="gap-3 p-6">
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2">Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th />
            </tr>
          </thead>
          <tbody>
            {pageSlice(users, page, PAGE).map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="py-2.5">{u.name}{u.id === user?.id && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</td>
                <td className="text-muted-foreground">{u.email}</td>
                <td>
                  {u.id === user?.id ? (
                    <StatusBadge status={u.role} />
                  ) : (
                    <Select value={u.role} onValueChange={(role) =>
                      role && act(() => api(`/api/admin/users/${u.id}/role`, { method: "POST", json: { role } }))()}>
                      <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </td>
                <td><StatusBadge status={u.status} /></td>
                <td className="tabular-nums">{fmtDate(u.createdAt)}</td>
                <td className="text-right">
                  {u.id !== user?.id && (
                    <Button size="sm" variant={u.status === "active" ? "destructive" : "secondary"}
                      onClick={act(() => api(`/api/admin/users/${u.id}/status`,
                        { method: "POST", json: { status: u.status === "active" ? "suspended" : "active" } }))}>
                      {u.status === "active" ? "Suspend" : "Reactivate"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <Pagination page={page} pageSize={PAGE} total={users.length} onPage={setPage} />
      </Card>
    </DashboardMain>
  );
}
