"use client";

import { useCallback, useEffect, useState } from "react";
import { api, auth, fmtDate } from "@/lib/client";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Drawer } from "@/components/drawer";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "@/components/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { TableFilter } from "@/components/table-filter";
import { Tip } from "@/components/tip";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";
import { ASSIGNABLE_ROLES, DEFAULT_SELF_SERVICE_ROLE } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PAGE = 12;

export default function UsersPage() {
  const { user, denied } = useDashboardGuard("/governance/users", ["superadmin"]);
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  // Active accounts by default; the filter widens the view. Server-side,
  // because the table is server-paginated.
  const [status, setStatus] = useState<"all" | "active" | "suspended">("active");
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    const filter = status === "all" ? "" : `&status=${status}`;
    const u = await api(`/api/admin/users?page=${page}&pageSize=${PAGE}${filter}`);
    setUsers(u.users);
    setTotal(u.total);
  }, [page, status]);

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
      actions={
        <Tip content="Add a user">
          <Button
            aria-label="Add a user"
            size="icon"
            variant="ghost"
            className="rounded-full text-ink hover:text-ink"
            onClick={() => setAddOpen(true)}
          >
            <PlusCircle className="size-7" aria-hidden="true" />
          </Button>
        </Tip>
      }
    >
      <div className="flex justify-end">
        <TableFilter
          label="Filter users by status"
          value={status}
          options={[
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
            { value: "all", label: "All statuses" },
          ]}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
      </div>
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
      {total === 0 && status !== "all" && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No {status} users. Switch the filter to All statuses to see everyone.
        </p>
      )}

      {addOpen && (
        <AddUserDrawer
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            load().catch((e) => toast.error(e.message));
          }}
        />
      )}
    </DashboardMain>
  );
}

// Superadmin creates an account with any role; the new user signs in with the
// password entered here and can change it afterwards.
function AddUserDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(DEFAULT_SELF_SERVICE_ROLE);
  const [busy, setBusy] = useState(false);

  const ready = name.trim() && email.trim() && password.length >= 6;

  async function submit() {
    setBusy(true);
    try {
      await api("/api/admin/users", {
        method: "POST",
        json: { name: name.trim(), email: email.trim(), password, role },
      });
      toast.success(`Added ${name.trim()} with the ${role} role`);
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      title="Add user"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!ready || busy} onClick={submit}>
            {busy ? "Adding..." : "Add user"}
          </Button>
        </>
      }
    >
      <section className="space-y-3 rounded-lg border border-[#e0e0e0] bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
          Account
        </h3>
        <div className="space-y-1.5">
          <label htmlFor="new-user-name" className="text-sm font-medium text-ink">
            Name
          </label>
          <Input
            id="new-user-name"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="new-user-email" className="text-sm font-medium text-ink">
            Email
          </label>
          <Input
            id="new-user-email"
            type="email"
            placeholder="user@example.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="new-user-password" className="text-sm font-medium text-ink">
            Password
          </label>
          <Input
            id="new-user-password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-[#e0e0e0] bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">Role</h3>
        <Select value={role} onValueChange={(r) => r && setRole(r)}>
          <SelectTrigger className="w-48">
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
        <p className="text-sm text-muted-foreground">
          Reviewer and superadmin are governance roles: they can only be granted here, never claimed
          at registration.
        </p>
      </section>
    </Drawer>
  );
}
