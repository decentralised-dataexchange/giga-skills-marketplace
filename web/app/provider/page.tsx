"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Pencil, ScrollText, Send } from "@/components/icons";
import { api, auth } from "@/lib/client";
import { toast } from "@/components/toast";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/tip";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_LOGO_BYTES = 400 * 1024;
const MAX_COVER_BYTES = 900 * 1024;

// Underlined inline field, as on the iGrant.io Getting Started profile card.
const INLINE_FIELD =
  "block w-full max-w-md border-0 border-b border-input bg-transparent py-1 text-sm text-ink outline-none placeholder:text-black/40 focus-visible:border-ink";

function monogram(s: string) {
  return (s || "?")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase();
}

// Grey uppercase section heading, as on the reference page.
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">{children}</h2>
  );
}

export default function GettingStartedPage() {
  const { denied } = useDashboardGuard("/provider", ["provider"]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [o, s] = await Promise.all([api("/api/orgs/mine"), api("/api/skills/mine")]);
    setOrgs(o.orgs);
    setSkills(s.skills);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (auth.user?.role === "provider")
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState happens after await
      load().catch((e) => toast.error(e.message, "Could not load your organisation"));
  }, [load]);

  const org = orgs[0] ?? null;
  const versions = skills.flatMap((s) => s.versions ?? []);
  const tiles: [value: number, label: string][] = [
    [skills.filter((s) => s.status === "published").length, "Published skills"],
    [versions.filter((v) => ["submitted", "in_review"].includes(v.status)).length, "In review"],
    [versions.filter((v) => v.status === "changes_requested").length, "Changes requested"],
    [new Set(versions.map((v) => v.repo?.url).filter(Boolean)).size, "Source repositories"],
  ];

  return (
    <DashboardMain
      title="Getting Started"
      subtitle="Your organisation at a glance: profile, catalog stats, and quick actions."
      denied={denied}
    >
      {loaded && !org && <RegisterCard onDone={load} onError={(m) => m && toast.error(m)} />}

      {org && (
        <>
          {/* Stat tiles, in the NXD dashboard treatment */}
          <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
            {tiles.map(([n, label]) => (
              <Card key={label} className="gap-0.5 px-4 py-3 text-center">
                <span className="text-[22px] font-bold leading-tight tabular-nums text-[#1d1d1f]">
                  {n}
                </span>
                <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.66px] text-[#86868b]">
                  {label}
                </span>
              </Card>
            ))}
          </div>

          <ProfileCard
            org={org}
            onChange={(o) => setOrgs([o])}
            onError={(m) => m && toast.error(m)}
          />

          {/* Quick actions */}
          <SectionHeading>Quick actions</SectionHeading>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/provider/submissions?publish=1"
              className="group flex items-start gap-4 rounded-[5px] border border-[#e0e0e0] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.1)] transition-colors hover:border-brand"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cyan-tint">
                <Send className="size-5 text-brand" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold text-ink group-hover:text-brand">
                  Publish skills
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  Submit a public GitHub repository; every skill goes through checks and review.
                </span>
              </span>
            </Link>
            <Link
              href="/provider/submissions"
              className="group flex items-start gap-4 rounded-[5px] border border-[#e0e0e0] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.1)] transition-colors hover:border-brand"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cyan-tint">
                <ScrollText className="size-5 text-brand" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold text-ink group-hover:text-brand">
                  Skill sources
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  Your source repositories, their skills, and every audit check report.
                </span>
              </span>
            </Link>
          </div>
        </>
      )}
    </DashboardMain>
  );
}

// Cover banner + logo + inline-editable profile, as the iGrant.io Getting
// Started page: view shows text rows with an Edit link; Edit swaps the rows to
// underlined inputs in place, with CANCEL / SAVE buttons in the corner.
function ProfileCard({
  org,
  onChange,
  onError,
}: {
  org: any;
  onChange: (org: any) => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", website: "", description: "" });
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setForm({
      name: org.name ?? "",
      website: org.website ?? "",
      description: org.description ?? "",
    });
    setEditing(true);
    onError("");
  }

  async function patch(json: Record<string, unknown>, done?: () => void) {
    try {
      const { org: updated } = await api(`/api/orgs/${org.id}`, { method: "PATCH", json });
      onChange(updated);
      toast.success("Organisation updated.");
      done?.();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  }

  function pickImage(kind: "logo" | "cover", file?: File) {
    if (!file) return;
    const max = kind === "logo" ? MAX_LOGO_BYTES : MAX_COVER_BYTES;
    if (file.size > max) {
      onError(`Image must be under ${Math.round(max / 1024)} KB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch({ [kind]: String(reader.result) });
    reader.readAsDataURL(file);
  }

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {/* Cover banner; the pencil swaps it, as on the reference. */}
      <div className="relative h-36 w-full bg-[linear-gradient(90deg,#0a1f52,#0050d6)] sm:h-44">
        {org.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.cover} alt="" className="size-full object-cover" />
        )}
        <Tip content="Change cover image (up to ~900 KB)">
          <button
            type="button"
            aria-label="Change cover image"
            onClick={() => coverRef.current?.click()}
            className="absolute right-3 top-3 grid size-9 cursor-pointer place-items-center rounded-lg bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
        </Tip>
        {editing && org.cover && (
          <button
            type="button"
            onClick={() => patch({ cover: null })}
            className="absolute right-14 top-3 cursor-pointer rounded-lg bg-black/50 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-black/70"
          >
            Remove cover
          </button>
        )}
      </div>
      <input
        ref={coverRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          pickImage("cover", e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={logoRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          pickImage("logo", e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="px-6 pb-6">
        <div className="flex flex-wrap items-start gap-5">
          {/* Logo circle overlapping the banner. The tooltip wraps the button
              only while editing - a disabled anchor never shows one. */}
          {(() => {
            const logoButton = (
              <button
                type="button"
                aria-label="Change logo"
                disabled={!editing}
                onClick={() => logoRef.current?.click()}
                className="group relative -mt-10 shrink-0 cursor-pointer rounded-full border-none bg-transparent p-0 disabled:cursor-default"
              >
                {org.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={org.logo}
                    alt=""
                    className="size-20 rounded-full bg-white object-cover ring-4 ring-white"
                  />
                ) : (
                  <span className="grid size-20 place-items-center rounded-full bg-cyan-tint text-xl font-bold text-brand ring-4 ring-white">
                    {monogram(editing ? form.name : org.name)}
                  </span>
                )}
                {editing && (
                  <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-[10px] font-bold uppercase tracking-wide text-white opacity-90 transition-opacity group-hover:opacity-100">
                    Change
                  </span>
                )}
              </button>
            );
            return editing ? (
              <Tip content="Change logo (up to 400 KB)">{logoButton}</Tip>
            ) : (
              logoButton
            );
          })()}

          {/* Name and links: text rows, or underlined inputs in place */}
          <div className="min-w-0 flex-1 pt-2">
            {editing ? (
              <div className="space-y-1">
                <input
                  aria-label="Organisation name"
                  className={`${INLINE_FIELD} text-lg font-bold`}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <input
                  aria-label="Website"
                  placeholder="https://..."
                  className={INLINE_FIELD}
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </div>
            ) : (
              <>
                <h3 className="truncate text-lg font-bold text-ink">{org.name}</h3>
                {org.website && (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand"
                  >
                    {org.website}
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                )}
              </>
            )}
          </div>

          <div className="pt-2">
            {editing ? (
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    patch(
                      {
                        name: form.name.trim(),
                        website: form.website.trim(),
                        description: form.description.trim(),
                      },
                      () => setEditing(false),
                    )
                  }
                >
                  Save
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEdit}
                className="cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-brand hover:underline"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        <hr className="my-5 border-[#e0e0e0]" />
        <SectionHeading>Overview</SectionHeading>
        {editing ? (
          <Textarea
            aria-label="Description"
            className="mt-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-ink">{org.description}</p>
        )}
      </div>
    </Card>
  );
}

// First run: no organisation yet. Registration is immediate; the profile card
// takes over as soon as it exists.
function RegisterCard({
  onDone,
  onError,
}: {
  onDone: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({ name: "", slug: "", website: "", description: "" });
  const [origin] = useState(() =>
    typeof window === "undefined" ? "https://your-marketplace-host" : window.location.origin,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/orgs", { method: "POST", json: form });
      toast.success("Organisation registered.");
      await onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Card className="max-w-xl gap-4 p-6">
      <h2 className="font-medium">Register your organisation</h2>
      <p className="text-sm text-muted-foreground">
        Registration is immediate; each submitted skill still goes through review.
      </p>
      <form className="space-y-3" onSubmit={submit}>
        <Input
          placeholder="Organisation name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div>
          <Input
            placeholder="Handle (optional, e.g. igrant-io)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Used in your marketplace URL:{" "}
            <code className="break-all font-mono">
              {origin}/marketplace/{slugify(form.slug || form.name || "your-handle")}
            </code>
          </p>
        </div>
        <Input
          placeholder="Website (https://...)"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
        />
        <Textarea
          placeholder="What do you provide?"
          required
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Button type="submit">Register organisation</Button>
      </form>
    </Card>
  );
}
