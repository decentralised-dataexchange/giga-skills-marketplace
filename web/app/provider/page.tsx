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
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    website: "",
    description: "",
    logo: null as string | null,
  });

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

  function startEdit(o: any) {
    setEditing(o.id);
    setEditForm({
      name: o.name ?? "",
      website: o.website ?? "",
      description: o.description ?? "",
      logo: o.logo ?? null,
    });
    setMessage("");
  }

  function pickLogo(file?: File) {
    if (!file) return;
    if (file.size > 400 * 1024) {
      setMessage("Logo must be under 400 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditForm((f) => ({ ...f, logo: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  async function saveOrg(id: number) {
    try {
      await api(`/api/orgs/${id}`, { method: "PATCH", json: editForm });
      setMessage("Organisation updated.");
      setEditing(null);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  const monogram = (s: string) =>
    (s || "?")
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 2)
      .toUpperCase();
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
          <Card key={o.id} className="gap-3 p-6">
            {editing === o.id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  {editForm.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editForm.logo}
                      alt=""
                      className="size-16 rounded-lg object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="grid size-16 place-items-center rounded-lg bg-cyan-tint text-lg font-bold text-brand ring-1 ring-brand/15">
                      {monogram(editForm.name)}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-accent">
                      Upload logo
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => pickLogo(e.target.files?.[0])}
                      />
                    </label>
                    {editForm.logo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditForm((f) => ({ ...f, logo: null }))}
                      >
                        Remove logo
                      </Button>
                    )}
                  </div>
                </div>
                <Input
                  placeholder="Organisation name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
                <Input
                  placeholder="Website (https://...)"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                />
                <Textarea
                  placeholder="What do you provide?"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button onClick={() => saveOrg(o.id)}>Save changes</Button>
                  <Button variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {o.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.logo}
                        alt=""
                        className="size-12 rounded-lg object-cover ring-1 ring-border"
                      />
                    ) : (
                      <div className="grid size-12 place-items-center rounded-lg bg-cyan-tint font-bold text-brand ring-1 ring-brand/15">
                        {monogram(o.name)}
                      </div>
                    )}
                    <h2 className="truncate text-lg font-medium">{o.name}</h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={o.status} />
                    <Button variant="secondary" size="sm" onClick={() => startEdit(o)}>
                      Edit
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{o.description}</p>
                {o.website && (
                  <a
                    href={o.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-fit text-sm font-semibold text-brand hover:underline"
                  >
                    {o.website}
                  </a>
                )}
                {o.slug && (
                  <p className="text-xs text-muted-foreground">
                    Install command:{" "}
                    <code className="font-mono">
                      npx skills add {origin}/{o.slug}
                    </code>
                  </p>
                )}
                {o.decisionNotes && (
                  <p className="text-sm text-muted-foreground">
                    <b>Reviewer notes:</b> {o.decisionNotes}
                  </p>
                )}
              </>
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
