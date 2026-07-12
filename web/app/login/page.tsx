"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { api, auth, type SessionUser } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Logo } from "@/components/logo";
import { primaryConsole } from "@/components/nav-links";

const DEMO_ACCOUNTS = [
  ["superadmin@govbuild.test", "super123", "Super admin (orgs, users, roles, full governance)"],
  ["reviewer@govbuild.test", "review123", "Skill reviewer (review queue only)"],
  ["provider@igrant.io", "provider123", "Approved provider (iGrant.io)"],
  ["labs@educhain.test", "provider123", "Provider awaiting org approval"],
  ["student@example.com", "student123", "Developer (student)"],
];

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "builder" });
  const [error, setError] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const { token, user } = await api<{ token: string; user: SessionUser }>(path, {
        method: "POST",
        json: form,
      });
      auth.signIn(token, user);
      router.push(next ?? primaryConsole(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <main className="flex flex-1 items-center justify-center bg-cyan-tint/40 px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Logo />
          <span className="text-sm font-semibold text-muted-foreground">Dashboard</span>
        </div>

        <Card className="gap-4 p-6">
          <div>
            <h1 className="text-xl font-bold text-ink">
              {mode === "register" ? "Create an account" : "Sign in"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage skills, use cases, and submissions. Browsing the marketplace does not need an
              account.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === "login" ? "default" : "secondary"}
              onClick={() => setMode("login")}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              variant={mode === "register" ? "default" : "secondary"}
              onClick={() => setMode("register")}
            >
              Create account
            </Button>
          </div>

          <form className="space-y-3" onSubmit={submit}>
            {mode === "register" && (
              <Input
                aria-label="Full name"
                autoComplete="name"
                placeholder="Full name"
                value={form.name}
                onChange={set("name")}
                required
              />
            )}
            <Input
              aria-label="Email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={form.email}
              onChange={set("email")}
              required
            />
            <Input
              aria-label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={form.password}
              onChange={set("password")}
              required
            />
            {mode === "register" && (
              <div className="space-y-2">
                {[
                  [
                    "builder",
                    "Developer",
                    "install skills and use cases into your own agent and showcase what you build",
                  ],
                  [
                    "provider",
                    "Provider",
                    "register an organisation and publish skills and use cases for review",
                  ],
                ].map(([value, title, desc]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={form.role === value}
                      onChange={set("role")}
                      className="mt-1 accent-brand"
                    />
                    <span>
                      <b>{title}</b> - {desc}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              {mode === "register" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            className="text-sm font-semibold text-brand hover:underline"
          >
            View demo accounts
          </button>
        </Card>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm font-semibold text-brand hover:underline">
            ← Back to marketplace
          </Link>
        </div>
      </div>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Demo accounts</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Click an account to fill the sign-in form.
          </p>
          <ul className="divide-y divide-border">
            {DEMO_ACCOUNTS.map(([email, password, label]) => (
              <li key={email}>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setForm((f) => ({ ...f, email, password }));
                    setDemoOpen(false);
                  }}
                  className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="font-mono text-ink">
                    {email} · {password}
                  </span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
