"use client";

import { useCallback, useEffect, useState } from "react";
import { api, auth, fmtDate } from "@/lib/client";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { TableFilter } from "@/components/table-filter";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function OrganisationsPage() {
  const { user, denied } = useDashboardGuard("/governance/organisations", ["superadmin"]);
  const [orgs, setOrgs] = useState<any[]>([]);
  // Approved is the active state of an organisation; the filter widens the view.
  const [filter, setFilter] = useState<"all" | "approved" | "suspended" | "rejected">("approved");
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const o = await api("/api/admin/orgs");
    setOrgs(o.orgs);
  }, []);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/api/admin/orgs/${toDelete.id}`, { method: "DELETE" });
      toast.success(`Deleted ${toDelete.name}`);
      setToDelete(null);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  }

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

  const visible = orgs.filter((o) => filter === "all" || o.status === filter);

  return (
    <DashboardMain
      title="Organisations"
      subtitle="Provider organisations register instantly; only their skills go through review."
      denied={denied}
    >
      <div className="flex justify-end">
        <TableFilter
          label="Filter organisations by status"
          value={filter}
          options={[
            { value: "approved", label: "Approved" },
            { value: "suspended", label: "Suspended" },
            { value: "rejected", label: "Rejected" },
            { value: "all", label: "All statuses" },
          ]}
          onChange={setFilter}
        />
      </div>
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
            width: 240,
            align: "right",
            ellipsis: false,
            render: (o: any) => (
              <div className="flex justify-end gap-2">
                {o.status === "approved" ? (
                  <Button size="sm" variant="destructive" onClick={setStatus(o, "suspended")}>
                    Suspend
                  </Button>
                ) : o.status === "suspended" ? (
                  <Button size="sm" variant="secondary" onClick={setStatus(o, "approved")}>
                    Reactivate
                  </Button>
                ) : null}
                {o.owner?.id !== user?.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setToDelete(o)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        rows={visible}
        rowKey={(o: any) => o.id}
      />
      {orgs.length > 0 && visible.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No {filter} organisations. Switch the filter to All statuses to see everything.
        </p>
      )}

      <ConfirmDialog
        open={!!toDelete}
        busy={deleting}
        title="Delete this organisation?"
        description={
          toDelete && (
            <>
              This permanently deletes <b className="text-ink">{toDelete.name}</b>, every skill it
              published, and the account of its owner
              {toDelete.owner?.name ? ` (${toDelete.owner.name})` : ""}. This cannot be undone. To
              take it off the catalog without losing the data, suspend it instead.
            </>
          )
        }
        confirmLabel="Delete organisation"
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setToDelete(null)}
      />
    </DashboardMain>
  );
}
