"use client";

import { CircleArrowRight, Loader2 } from "@/components/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { api, auth, type SessionUser } from "@/lib/client";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/tip";
import { Drawer } from "@/components/drawer";
import { Logo } from "@/components/logo";
import { Footer } from "@/components/footer";
import { primaryConsole } from "@/components/nav-links";
import { DEFAULT_SELF_SERVICE_ROLE } from "@/lib/roles";

const DEMO_ACCOUNTS = [
  ["superadmin@govbuild.test", "super123", "Super admin (orgs, users, roles, full governance)"],
  ["reviewer@govbuild.test", "review123", "Skill reviewer (review queue only)"],
  ["provider@igrant.io", "provider123", "Approved provider (iGrant.io)"],
  ["labs@educhain.test", "provider123", "Provider (EduChain Labs)"],
];

// Governance roles are granted by an operator, never claimed at registration.
// The chooser only appears when more than one role is on offer.
const REGISTER_ROLES: [role: string, title: string, description: string][] = [
  ["provider", "Provider", "register an organisation and publish skills for review"],
];

// The joined-field row treatment of the iGrant.io business login card.
const FIELD =
  "block w-full border-b border-black/10 bg-transparent pt-px pb-[5px] pl-1 text-[16px] leading-[23px] text-black outline-none placeholder:text-[14px] placeholder:text-black/40";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: DEFAULT_SELF_SERVICE_ROLE as string,
  });
  const [busy, setBusy] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const { token, user } = await api<{ token: string; user: SessionUser }>(path, {
        method: "POST",
        json: form,
      });
      auth.signIn(token, user);
      router.push(next ?? primaryConsole(user));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : String(err),
        mode === "register" ? "Could not create the account" : "Sign in failed",
      );
    } finally {
      setBusy(false);
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  function switchMode() {
    setMode((m) => (m === "login" ? "register" : "login"));
  }

  return (
    <main className="flex flex-1 justify-center bg-white px-4 pt-[14vh] pb-12 max-[520px]:pt-[6vh]">
      <div className="h-fit w-[min(468px,100%)]">
        <form
          className="w-full rounded-3xl border border-[#e0e0e0] bg-white px-[72px] py-12 shadow-[0_2px_12px_rgba(0,0,0,0.08)] max-[520px]:px-5 max-[520px]:py-7"
          onSubmit={submit}
        >
          <Logo className="mx-auto mb-4 block h-12 w-auto max-[520px]:mb-3 max-[520px]:h-10" />
          <h1 className="mb-5 text-center text-[20px] leading-8 font-medium text-black max-[520px]:mb-4 max-[520px]:text-[18px]">
            {mode === "register" ? "Create an account" : "Skills Marketplace"}
          </h1>

          {/* The joined input group with the arrow-circle submit, as on the
            iGrant.io / NXD trust-list sign-in. */}
          <div className="rounded-lg border border-[#bdbdbd] px-3 py-1">
            {mode === "register" && (
              <input
                aria-label="Full name"
                placeholder="Full name"
                autoComplete="name"
                required
                value={form.name}
                onChange={set("name")}
                className={FIELD}
              />
            )}
            <input
              aria-label="Email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              value={form.email}
              onChange={set("email")}
              className={FIELD}
            />
            <div className="flex items-center">
              <input
                aria-label="Password"
                type="password"
                placeholder="Password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
                value={form.password}
                onChange={set("password")}
                className="block min-w-0 flex-1 bg-transparent pt-[6px] pb-px pl-1 text-[16px] leading-[23px] text-black outline-none placeholder:text-[14px] placeholder:text-black/40"
              />
              {/* The span keeps the tooltip anchored while the button is
                  disabled during submit. */}
              <Tip content={mode === "register" ? "Create account" : "Sign in"}>
                <span className="inline-flex shrink-0">
                  <button
                    type="submit"
                    aria-label={mode === "register" ? "Create account" : "Sign in"}
                    disabled={busy}
                    className="inline-flex cursor-pointer items-center justify-center border-none bg-transparent p-0 text-[#9e9e9e] transition-colors hover:text-black disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="size-6 animate-spin" />
                    ) : (
                      <CircleArrowRight className="size-6" strokeWidth={1.7} />
                    )}
                  </button>
                </span>
              </Tip>
            </div>
          </div>

          {mode === "register" && REGISTER_ROLES.length > 1 && (
            <div className="mt-3 space-y-2">
              {REGISTER_ROLES.map(([value, title, desc]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#e0e0e0] p-3 text-sm text-black"
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={form.role === value}
                    onChange={set("role")}
                    className="mt-1 accent-black"
                  />
                  <span>
                    <b>{title}</b> - {desc}
                  </span>
                </label>
              ))}
            </div>
          )}
          {mode === "register" && (
            <p className="mt-2 mb-0 text-center text-[14px] text-black/60">
              Register as a provider and publish skills for review.
            </p>
          )}

          <div className="mt-6 flex items-center gap-2.5 text-[14px] text-black">
            <span className="h-px flex-1 bg-black/10" />
            OR
            <span className="h-px flex-1 bg-black/10" />
          </div>

          {/* The alternate action fills black on hover, like the reference
            wallet sign-in button. */}
          <button
            type="button"
            onClick={switchMode}
            className="mt-6 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#dfdfdf] bg-transparent text-[14px] text-black transition-colors hover:border-black hover:bg-black hover:text-white"
          >
            {mode === "register" ? "Sign in" : "Create account"}
          </button>
        </form>

        {/* Below the card: a low-stakes way in for visitors who just want a look. */}
        <p className="mt-5 text-center text-[14px] text-black/60">
          Want to try it out?{" "}
          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            className="cursor-pointer border-none bg-transparent p-0 text-black underline underline-offset-2"
          >
            Use a demo account
          </button>
        </p>
      </div>

      {demoOpen && (
        <Drawer
          title="Demo accounts"
          onClose={() => setDemoOpen(false)}
          footer={
            <Button variant="outline" onClick={() => setDemoOpen(false)}>
              Close
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">
            Click an account to fill the sign-in form.
          </p>
          <ul className="divide-y divide-border rounded-lg border border-[#e0e0e0] bg-white">
            {DEMO_ACCOUNTS.map(([email, password, label]) => (
              <li key={email}>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setForm((f) => ({ ...f, email, password }));
                    setDemoOpen(false);
                  }}
                  className="flex w-full cursor-pointer flex-col items-start gap-0.5 border-none bg-transparent px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <span className="font-medium text-ink">
                    {email} · {password}
                  </span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </Drawer>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <>
      <Suspense>
        <LoginForm />
      </Suspense>
      <Footer />
    </>
  );
}
