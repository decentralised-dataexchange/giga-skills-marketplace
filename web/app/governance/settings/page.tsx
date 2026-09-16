"use client";

import { useCallback, useEffect, useState } from "react";
import { api, auth } from "@/lib/client";
import { toast } from "@/components/toast";
import { DashboardMain, useDashboardGuard } from "@/components/dashboard-shell";

interface Settings {
  demoMode: boolean;
  selfServiceRegistration: boolean;
}

// The marketplace settings a super admin changes here, not by redeploying:
// demo mode and self-service provider registration. Each starts from the
// deployment's environment and keeps the last value set here.
export default function SettingsPage() {
  const { denied } = useDashboardGuard("/governance/settings", ["superadmin"]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState<keyof Settings | null>(null);

  const load = useCallback(async () => {
    const s = await api("/api/admin/settings");
    setSettings(s.settings);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch; setState after await
    if (auth.user?.role === "superadmin") load().catch((e) => toast.error(e.message));
  }, [load]);

  async function change(key: keyof Settings, value: boolean) {
    setBusy(key);
    try {
      const s = await api("/api/admin/settings", { method: "PATCH", json: { [key]: value } });
      setSettings(s.settings);
      toast.success(
        key === "demoMode"
          ? value
            ? "Demo mode is on: the demo accounts are active and offered on the sign-in page"
            : "Demo mode is off: the demo accounts are suspended and hidden"
          : value
            ? "Self-service registration is on"
            : "Self-service registration is off: only you can add accounts now",
      );
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
          description="The demo accounts (super admin, reviewer, two providers, public passwords) are active and offered under “Use a demo account”. Off, they are suspended and hidden. Turn it off on a real marketplace, signed in as a non-demo super admin."
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
