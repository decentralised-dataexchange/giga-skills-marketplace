"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, auth } from "@/lib/client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ProviderOrganisationPage() {
  const { denied } = useDashboardGuard("/provider", ["provider"]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [orgForm, setOrgForm] = useState({ name: "", slug: "", website: "", description: "" });
  const [origin] = useState(() =>
    typeof window === "undefined" ? "https://your-marketplace-host" : window.location.origin,
  );
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const o = await api("/api/orgs/mine");
    setOrgs(o.orgs);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState happens after await
    if (auth.user?.role === "provider") load().catch((e) => setMessage(e.message));
  }, [load]);

  async function submitOrg(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/orgs", { method: "POST", json: orgForm });
      setMessage("Organisation submitted for verification.");
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  const approvedOrg = orgs.find((o) => o.status === "approved");

  return (
    <DashboardMain
      title="Organisation"
      subtitle="Register your organisation and track its verification status."
      denied={denied}
    >
      {message && <p className="text-sm font-semibold text-brand">{message}</p>}

      {!orgs.length ? (
        <Card className="max-w-xl gap-4 p-6">
          <h2 className="font-medium">Register your organisation</h2>
          <p className="text-sm text-muted-foreground">
            A super admin verifies it before you can publish.
          </p>
          <form className="space-y-3" onSubmit={submitOrg}>
            <Input
              placeholder="Organisation name"
              required
              value={orgForm.name}
              onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
            />
            <div>
              <Input
                placeholder="Handle (optional, e.g. igrant-io)"
                value={orgForm.slug}
                onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Used in your skills install command:{" "}
                <code className="font-mono">
                  npx skills add {origin}/{slugify(orgForm.slug || orgForm.name || "your-handle")}
                </code>
              </p>
            </div>
            <Input
              placeholder="Website (https://...)"
              value={orgForm.website}
              onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
            />
            <Textarea
              placeholder="What do you provide?"
              required
              value={orgForm.description}
              onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
            />
            <Button type="submit">Submit for verification</Button>
          </form>
        </Card>
      ) : (
        orgs.map((o) => (
          <Card key={o.id} className="gap-2 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">{o.name}</h2>
              <StatusBadge status={o.status} />
            </div>
            <p className="text-sm text-muted-foreground">{o.description}</p>
            {o.decisionNotes && (
              <p className="text-sm text-muted-foreground">
                <b>Reviewer notes:</b> {o.decisionNotes}
              </p>
            )}
          </Card>
        ))
      )}

      {approvedOrg && (
        <p className="text-sm text-muted-foreground">
          Your organisation is verified.{" "}
          <Link href="/provider/submit" className="font-semibold text-brand hover:underline">
            Publish a skill or use case →
          </Link>
        </p>
      )}
    </DashboardMain>
  );
}
