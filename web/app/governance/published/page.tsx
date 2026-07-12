"use client";

import { useCallback, useEffect, useState } from "react";
import { api, auth } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OfficialBadge } from "@/components/official-badge";
import { Pagination, pageSlice } from "@/components/pagination";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PAGE = 12;

export default function PublishedPage() {
  const { denied } = useDashboardGuard("/governance/published", ["superadmin"]);
  const [published, setPublished] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const m = await api("/api/marketplace?pageSize=48");
    setPublished(m.skills);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState after await
    if (auth.user?.role === "superadmin") load().catch((e) => setMessage(e.message));
  }, [load]);

  const act = (fn: () => Promise<unknown>) => () =>
    fn()
      .then(load)
      .catch((e) => setMessage(e.message));

  return (
    <DashboardMain
      title="Published"
      subtitle="Endorse as Official to signal operator-sanctioned; others show as Community. Delist to remove from the marketplace."
      denied={denied}
    >
      {message && <p className="text-sm font-semibold text-amber-600">{message}</p>}
      <Card className="gap-3 p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Name</th>
                <th>Type</th>
                <th>Endorsement</th>
                <th>Provider</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageSlice(published, page, PAGE).map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2.5 font-semibold">
                    <a
                      className="hover:underline"
                      href={`/${s.type === "usecase" ? "usecase" : "skill"}/${s.slug}`}
                    >
                      {s.slug}
                    </a>
                  </td>
                  <td>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        s.type === "usecase"
                          ? "bg-brand/10 text-brand"
                          : "bg-secondary text-ink/70",
                      )}
                    >
                      {s.type === "usecase" ? "Use case" : "Skill"}
                    </span>
                  </td>
                  <td>
                    <OfficialBadge official={s.official} />
                  </td>
                  <td>{s.org.name}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={act(() =>
                          api(`/api/skills/${s.id}/official`, {
                            method: "POST",
                            json: { official: !s.official },
                          }),
                        )}
                      >
                        {s.official ? "Make community" : "Make official"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Delist "${s.slug}" from the marketplace?`))
                            act(() => api(`/api/skills/${s.id}/delist`, { method: "POST" }))();
                        }}
                      >
                        Delist
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE} total={published.length} onPage={setPage} />
      </Card>
    </DashboardMain>
  );
}
