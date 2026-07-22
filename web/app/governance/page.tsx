"use client";

import { useEffect, useState } from "react";
import { api, auth } from "@/lib/client";
import { Card } from "@/components/ui/card";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";
import { FEATURES } from "@/lib/features";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function GovernanceOverviewPage() {
  const { denied } = useDashboardGuard("/governance", ["reviewer", "superadmin"]);
  const [stats, setStats] = useState<any>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (auth.user && ["reviewer", "superadmin"].includes(auth.user.role)) {
      api("/api/admin/stats")
        .then((d) => setStats(d.stats))
        .catch((e) => setMessage(e.message));
    }
  }, []);

  const cards = stats
    ? [
        [stats.skillsByStatus.published ?? 0, "Published skills"],
        [stats.usecasesByStatus?.published ?? 0, "Published use cases"],
        ...(FEATURES.showcase ? [[stats.applications ?? 0, "Showcase apps"]] : []),
        [stats.reviewQueue, "In review queue"],
        [stats.orgsByStatus.approved ?? 0, "Verified providers"],
        [stats.orgsByStatus.pending ?? 0, "Orgs pending"],
        FEATURES.developerRole
          ? [
              (stats.usersByRole.builder ?? 0) + (stats.usersByRole.provider ?? 0),
              "Developers & providers",
            ]
          : [stats.usersByRole.provider ?? 0, "Provider accounts"],
      ]
    : [];

  return (
    <DashboardMain
      title="Overview"
      subtitle="Marketplace and governance metrics at a glance."
      denied={denied}
    >
      {message && <p className="text-sm font-semibold text-amber-600">{message}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {cards.map(([n, label]) => (
          <Card key={label} className="gap-0.5 p-4">
            <span className="text-2xl font-semibold tabular-nums">{n}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </Card>
        ))}
      </div>
    </DashboardMain>
  );
}
