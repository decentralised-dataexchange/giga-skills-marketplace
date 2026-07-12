"use client";

import { useEffect, useRef, useState } from "react";
import { api, auth, fmtDate, useSession } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";

const MAX_AVATAR_BYTES = 256 * 1024;

interface Profile {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar: string | null;
  createdAt: string | null;
}

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// Small inline banner used by every section for success/error feedback. It is an
// aria-live region so screen readers announce the result of an action.
function Notice({ text, tone }: { text: string; tone: "ok" | "error" }) {
  if (!text) return null;
  return (
    <p
      role="status"
      className={
        tone === "error"
          ? "text-sm font-medium text-destructive"
          : "text-sm font-medium text-emerald-700"
      }
    >
      {text}
    </p>
  );
}

export default function SettingsPage() {
  const session = useSession();
  const [section, setSection] = useState<SectionId>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && !auth.user) {
      location.href = "/login?next=/settings";
      return;
    }
    api("/api/auth/me")
      .then((d) => setProfile(d.user))
      .catch((e) => setLoadError(e.message));
  }, []);

  if (loadError)
    return (
      <main className="mx-auto max-w-none px-6 lg:px-8 py-10 text-muted-foreground">
        {loadError}
      </main>
    );
  if (!profile)
    return (
      <main className="mx-auto max-w-none px-6 lg:px-8 py-10 text-muted-foreground">Loading…</main>
    );

  return (
    <main className="mx-auto w-full max-w-none px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage your account, security, and agent preferences.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[190px_1fr]">
        <nav aria-label="Settings sections" className="flex gap-1 md:flex-col">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-current={section === s.id ? "true" : undefined}
              onClick={() => setSection(s.id)}
              className={
                "rounded-lg px-3.5 py-2 text-left text-sm font-semibold transition-colors " +
                (section === s.id
                  ? "bg-secondary text-ink"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-ink")
              }
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div>
          {section === "profile" && (
            <ProfileSection
              profile={profile}
              onChange={setProfile}
              sessionName={session?.name ?? profile.name}
            />
          )}
          {section === "security" && <SecuritySection />}
        </div>
      </div>
    </main>
  );
}

function ProfileSection({
  profile,
  onChange,
  sessionName,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
  sessionName: string;
}) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveAvatar(avatar: string | null) {
    setErr("");
    setMsg("");
    try {
      const { user } = await api("/api/auth/me", { method: "PATCH", json: { avatar } });
      onChange(user);
      auth.update({ avatar: user.avatar });
      setMsg(avatar ? "Photo updated." : "Photo removed.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setErr("Image must be under 256 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => saveAvatar(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const { user } = await api("/api/auth/me", { method: "PATCH", json: { name, email } });
      onChange(user);
      auth.update({ name: user.name, email: user.email });
      setMsg("Profile saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-4">
      <Card className="gap-5 p-6">
        <h2 className="text-lg font-bold text-ink">Profile picture</h2>
        <div className="flex flex-wrap items-center gap-5">
          <UserAvatar name={sessionName} avatar={profile.avatar} size="lg" />
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button type="button" onClick={() => fileRef.current?.click()}>
                Upload photo
              </Button>
              {profile.avatar && (
                <Button type="button" variant="secondary" onClick={() => saveAvatar(null)}>
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPEG, GIF, or WebP, up to 256 KB.</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            hidden
            onChange={onFile}
          />
        </div>
      </Card>

      <Card className="gap-4 p-6">
        <h2 className="text-lg font-bold text-ink">Account details</h2>
        <form className="space-y-4" onSubmit={saveProfile}>
          <div className="space-y-1.5">
            <label htmlFor="acct-name" className="text-sm font-medium text-ink">
              Full name
            </label>
            <Input
              id="acct-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="acct-email" className="text-sm font-medium text-ink">
              Email address
            </label>
            <Input
              id="acct-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Notice text={err} tone="error" />
          <Notice text={msg} tone="ok" />
          <Button type="submit">Save changes</Button>
        </form>
      </Card>

      <Card className="gap-3 p-6">
        <h2 className="text-lg font-bold text-ink">Account</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Role</dt>
            <dd className="mt-1">
              <Badge variant="secondary" className="capitalize">
                {profile.role === "builder" ? "Developer" : profile.role}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={profile.status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="mt-1 text-ink">{fmtDate(profile.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Account ID</dt>
            <dd className="mt-1 tabular-nums text-ink">#{profile.id}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (next !== confirm) {
      setErr("New passwords do not match.");
      return;
    }
    try {
      await api("/api/auth/password", {
        method: "POST",
        json: { currentPassword: current, newPassword: next },
      });
      setMsg("Password updated. Other sessions were signed out.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Card className="gap-4 p-6">
      <div>
        <h2 className="text-lg font-bold text-ink">Change password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Updating your password signs out every other session on your account.
        </p>
      </div>
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <label htmlFor="pw-current" className="text-sm font-medium text-ink">
            Current password
          </label>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pw-new" className="text-sm font-medium text-ink">
            New password
          </label>
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={6}
          />
          <p className="text-xs text-muted-foreground">At least 6 characters.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pw-confirm" className="text-sm font-medium text-ink">
            Confirm new password
          </label>
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <Notice text={err} tone="error" />
        <Notice text={msg} tone="ok" />
        <Button type="submit">Update password</Button>
      </form>
    </Card>
  );
}
