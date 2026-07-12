"use client";

import { useCallback, useEffect, useState } from "react";
import { api, auth, fmtDate } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function OrganisationsPage() {
  const { denied } = useDashboardGuard("/governance/organisations", ["superadmin"]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const o = await api("/api/admin/orgs");
    setOrgs(o.orgs);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState after await
    if (auth.user?.role === "superadmin") load().catch((e) => setMessage(e.message));
  }, [load]);

  const act = (fn: () => Promise<unknown>) => () =>
    fn()
      .then(load)
      .catch((e) => setMessage(e.message));
  const pending = orgs.filter((o) => o.status === "pending");

  return (
    <DashboardMain
      title="Organisations"
      subtitle="Verify provider organisations before they can publish."
      denied={denied}
    >
      {message && <p className="text-sm font-semibold text-amber-600">{message}</p>}
      <Card className="gap-3 p-6">
        <h2 className="font-medium">
          Awaiting verification{" "}
          <span className="tabular-nums text-muted-foreground">({pending.length})</span>
        </h2>
        {pending.length ? (
          pending.map((o) => (
            <div key={o.id} className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <b>{o.name}</b>
                <span className="text-xs text-muted-foreground">{fmtDate(o.createdAt)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {o.description}{" "}
                {o.website && (
                  <a
                    className="font-semibold text-brand"
                    href={o.website}
                    target="_blank"
                    rel="noopener"
                  >
                    {o.website}
                  </a>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Contact: {o.contact} · Owner: {o.owner.name} ({o.owner.email})
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  onClick={act(() =>
                    api(`/api/admin/orgs/${o.id}/decision`, {
                      method: "POST",
                      json: { decision: "approve" },
                    }),
                  )}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={act(() =>
                    api(`/api/admin/orgs/${o.id}/decision`, {
                      method: "POST",
                      json: { decision: "reject", notes: prompt("Reason for rejection:") ?? "" },
                    }),
                  )}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No organisations awaiting verification.
          </p>
        )}
      </Card>

      <Card className="gap-3 p-6">
        <h2 className="font-medium">All organisations</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Name</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="py-2.5 font-semibold">{o.name}</td>
                  <td className="capitalize text-muted-foreground">{o.status}</td>
                  <td className="text-muted-foreground">{o.owner.name}</td>
                  <td className="tabular-nums text-muted-foreground">{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardMain>
  );
}
