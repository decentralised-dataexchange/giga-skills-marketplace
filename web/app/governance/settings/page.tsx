"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, auth } from "@/lib/client";
import { toast } from "@/components/toast";
import { Notice } from "@/components/notice";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

interface Settings {
  demoMode: boolean;
  selfServiceRegistration: boolean;
}

interface SettingsView {
  settings: Settings;
  /** The signed-in super admin is one of the demo accounts. */
  demoAccountSignedIn: boolean;
}

// The marketplace settings a super admin changes here, not by redeploying:
// demo mode and self-service provider registration. Each starts from the
// deployment's environment and keeps the last value set here.
export default function SettingsPage() {
  const { denied } = useDashboardGuard("/governance/settings", ["superadmin"]);
  const [view, setView] = useState<SettingsView | null>(null);
  const [busy, setBusy] = useState<keyof Settings | null>(null);
  const settings = view?.settings;

  const load = useCallback(async () => {
    setView(await api("/api/admin/settings"));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState after await
    if (auth.user?.role === "superadmin") load().catch((e) => toast.error(e.message));
  }, [load]);

  async function change(key: keyof Settings, value: boolean) {
    setBusy(key);
    try {
      const next: SettingsView = await api("/api/admin/settings", {
        method: "PATCH",
        json: { [key]: value },
      });
      setView(next);
      if (key === "demoMode") {
        if (value) {
          toast.success(
            "Demo mode is on: the demo accounts are active and offered on the sign-in page",
          );
        } else if (next.demoAccountSignedIn) {
          toast.success(
            "Demo mode is off: the other demo accounts are suspended and hidden. Your own account is still a demo account, so change its password now.",
          );
        } else {
          toast.success("Demo mode is off: the demo accounts are suspended and hidden");
        }
      } else {
        toast.success(
          value
            ? "Self-service registration is on"
            : "Self-service registration is off: only you can add accounts now",
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <DashboardMain
      title="Settings"
      subtitle="How this marketplace is run. Changes apply at once, without a redeploy."
      denied={denied}
    >
      {view && !view.settings.demoMode && view.demoAccountSignedIn && (
        <Notice severity="warning" title="You are signed in with a demo account">
          Its password is public. Change it under{" "}
          <Link href="/settings" className="font-semibold underline">
            Manage User
          </Link>
          , or add a real super admin under Users &amp; roles and sign in with that instead.
        </Notice>
      )}
      <section className="space-y-4 rounded-lg border border-[#e0e0e0] bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.66px] text-[#86868b]">
          Sign-in page
        </h3>
        <SettingRow
          id="self-service-registration"
          title="Self-service registration"
          description="Visitors can create a provider account themselves. Off, the sign-in page shows no “Create account” and the register endpoint refuses; you add accounts under Users & roles."
          checked={settings?.selfServiceRegistration ?? false}
          disabled={!settings || busy != null}
          onChange={(v) => change("selfServiceRegistration", v)}
        />
        <SettingRow
          id="demo-mode"
          title="Demo mode"
          description="The demo accounts (super admin, reviewer, two providers, public passwords) are active and offered under “Use a demo account”. Off, they are suspended and hidden; the account you are signed in with stays active. Turn it off on a real marketplace."
          checked={settings?.demoMode ?? false}
          disabled={!settings || busy != null}
          onChange={(v) => change("demoMode", v)}
        />
      </section>
    </DashboardMain>
  );
}

function SettingRow({
  id,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-t border-[#f0f0f0] pt-4 first:border-t-0 first:pt-0">
      <div className="space-y-1">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {title}
        </label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-black" : "bg-[#d1d1d6]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
