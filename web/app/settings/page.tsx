"use client";

import { useEffect, useRef, useState } from "react";
import { api, auth, useSession } from "@/lib/client";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/tip";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

const MAX_AVATAR_BYTES = 256 * 1024;

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar: string | null;
  createdAt: string | null;
}

// Grey uppercase card heading, as on the iGrant.io Manage User page.
function CardHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">{children}</h2>
  );
}

// Link-style action in the card's bottom corner ("Edit", "Change Password").
function CardAction(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-brand hover:underline disabled:opacity-50"
    />
  );
}

export default function ManageUserPage() {
  const { denied } = useDashboardGuard("/settings");
  const session = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && !auth.user) return;
    api("/api/auth/me")
      .then((d) => setProfile(d.user))
      .catch((e) => setLoadError(e.message));
  }, []);

  return (
    <DashboardMain
      title="Manage User"
      subtitle="View and update your profile, and change your password."
      denied={denied}
    >
      {loadError && <p className="text-sm font-semibold text-amber-600">{loadError}</p>}
      {profile && (
        // Default grid stretch keeps both cards the same height per row.
        <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <UserSettingsCard
            profile={profile}
            onChange={setProfile}
            sessionName={session?.name ?? profile.name}
          />
          <UserCredentialsCard />
        </div>
      )}
    </DashboardMain>
  );
}

// The profile card: avatar beside Name / Email / User ID rows, with an Edit
// action that flips the card into a small form (name, email, photo).
function UserSettingsCard({
  profile,
  onChange,
  sessionName,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
  sessionName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveAvatar(avatar: string | null) {
    try {
      const { user } = await api("/api/auth/me", { method: "PATCH", json: { avatar } });
      onChange(user);
      auth.update({ avatar: user.avatar });
      toast.success(avatar ? "Photo updated." : "Photo removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be under 256 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => saveAvatar(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { user } = await api("/api/auth/me", { method: "PATCH", json: { name, email } });
      onChange(user);
      auth.update({ name: user.name, email: user.email });
      toast.success("Profile saved.");
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  function cancelEdit() {
    setEditing(false);
    setName(profile.name);
    setEmail(profile.email);
  }

  // One layout for both modes: the rows stay in place and the editable values
  // swap to inputs inline, as on the iGrant.io Manage User card.
  return (
    <Card className="gap-5 p-6">
      <CardHeading>User settings</CardHeading>
      <form className="contents" onSubmit={saveProfile}>
        <div className="flex flex-wrap items-center gap-8 max-[480px]:gap-5">
          {editing ? (
            <div className="grid shrink-0 justify-items-center gap-1.5">
              <Tip content="Change photo (PNG, JPEG, GIF, or WebP, up to 256 KB)">
                <button
                  type="button"
                  aria-label="Change photo (up to 256 KB)"
                  onClick={() => fileRef.current?.click()}
                  className="group relative cursor-pointer rounded-full border-none bg-transparent p-0"
                >
                  <UserAvatar name={sessionName} avatar={profile.avatar} size="lg" decorative />
                  <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-[10px] font-bold uppercase tracking-wide text-white opacity-90 transition-opacity group-hover:opacity-100">
                    Change
                  </span>
                </button>
              </Tip>
              {profile.avatar && (
                <button
                  type="button"
                  onClick={() => saveAvatar(null)}
                  className="cursor-pointer border-none bg-transparent p-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-ink"
                >
                  Remove photo
                </button>
              )}
            </div>
          ) : (
            <UserAvatar name={sessionName} avatar={profile.avatar} size="lg" />
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            hidden
            onChange={onFile}
          />
          <dl className="grid min-w-0 flex-1 grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-8 gap-y-3 text-sm max-[480px]:gap-x-4">
            <dt className="text-muted-foreground">
              <label htmlFor="acct-name">Name:</label>
            </dt>
            <dd>
              {editing ? (
                <Input
                  id="acct-name"
                  className="max-w-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                />
              ) : (
                <span className="font-medium text-ink">{profile.name}</span>
              )}
            </dd>
            <dt className="text-muted-foreground">
              <label htmlFor="acct-email">Email:</label>
            </dt>
            <dd className="break-all text-ink">
              {editing ? (
                <Input
                  id="acct-email"
                  type="email"
                  className="max-w-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              ) : (
                profile.email
              )}
            </dd>
            <dt className="text-muted-foreground">User ID:</dt>
            <dd className="break-all text-xs text-ink">{profile.id}</dd>
          </dl>
        </div>
        {editing ? (
          <div className="mt-auto flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button type="submit" variant="outline">
              Save
            </Button>
          </div>
        ) : (
          <div className="mt-auto flex justify-end">
            <CardAction type="button" onClick={() => setEditing(true)}>
              Edit
            </CardAction>
          </div>
        )}
      </form>
    </Card>
  );
}

// The password card: labelled rows with placeholder inputs and a
// "Change Password" action in the corner.
function UserCredentialsCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    try {
      await api("/api/auth/password", {
        method: "POST",
        json: { currentPassword: current, newPassword: next },
      });
      toast.success("Password updated. Other sessions were signed out.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  const label = "text-sm text-ink whitespace-nowrap";

  return (
    <Card className="gap-5 p-6">
      <CardHeading>User credentials</CardHeading>
      {/* One grid for all rows: every label shares the same column, so every
          input starts at the same edge and gets the same width. The action
          pins to the card's bottom so both cards close at the same height. */}
      <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={submit}>
        <div className="grid grid-cols-1 items-center gap-x-4 gap-y-2 sm:grid-cols-[max-content_1fr] sm:gap-y-4">
          <label htmlFor="pw-current" className={label}>
            Current Password:
          </label>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            placeholder="Enter Current Password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
          <label htmlFor="pw-new" className={label}>
            New Password:
          </label>
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            placeholder="Enter New Password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={6}
          />
          <label htmlFor="pw-confirm" className={label}>
            Confirm New Password:
          </label>
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm New Password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          At least 6 characters. Changing your password signs out every other session.
        </p>
        <div className="mt-auto flex justify-end">
          <CardAction type="submit">Change Password</CardAction>
        </div>
      </form>
    </Card>
  );
}
