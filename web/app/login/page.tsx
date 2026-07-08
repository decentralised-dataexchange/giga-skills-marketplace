"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { api, auth, type SessionUser } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const DEMO_ACCOUNTS = [
  ["superadmin@govbuild.test", "super123", "Super admin (orgs, users, roles, full governance)"],
  ["reviewer@govbuild.test", "review123", "Skill reviewer (review queue only)"],
  ["provider@igrant.io", "provider123", "Approved provider (iGrant.io)"],
  ["labs@educhain.test", "provider123", "Provider awaiting org approval"],
  ["student@example.com", "student123", "Builder (student)"],
];

const HOME: Record<string, string> = { provider: "/provider", reviewer: "/governance", superadmin: "/governance" };

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "builder" });
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const { token, user } = await api<{ token: string; user: SessionUser }>(path, { method: "POST", json: form });
      auth.signIn(token, user);
      router.push(next ?? HOME[user.role] ?? "/builder");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-20 pt-10">
      <h1 className="text-2xl font-medium tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Or create an account as a builder (build apps with skills) or a provider (publish skills for review).
      </p>

      <Card className="mt-6 gap-4 p-6">
        <div className="flex gap-2">
          <Button size="sm" variant={mode === "login" ? "default" : "secondary"} onClick={() => setMode("login")}>
            Sign in
          </Button>
          <Button size="sm" variant={mode === "register" ? "default" : "secondary"} onClick={() => setMode("register")}>
            Create account
          </Button>
        </div>
        <form className="space-y-3" onSubmit={submit}>
          {mode === "register" && <Input placeholder="Full name" value={form.name} onChange={set("name")} required />}
          <Input type="email" placeholder="Email" value={form.email} onChange={set("email")} required />
          <Input type="password" placeholder="Password" value={form.password} onChange={set("password")} required />
          {mode === "register" && (
            <div className="space-y-2">
              {[
                ["builder", "Build apps", "use marketplace skills in the App Builder (student, implementer, anyone)"],
                ["provider", "Publish skills", "register an organisation and submit skill files for review"],
              ].map(([value, title, desc]) => (
                <label key={value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm">
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={form.role === value}
                    onChange={set("role")}
                    className="mt-1 accent-blue-400"
                  />
                  <span>
                    <b>{title}</b> - {desc}
                  </span>
                </label>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit">{mode === "register" ? "Create account" : "Sign in"}</Button>
        </form>
      </Card>

      <Card className="mt-4 gap-2 p-6">
        <h2 className="font-medium">Demo accounts</h2>
        <table className="w-full text-sm">
          <tbody>
            {DEMO_ACCOUNTS.map(([email, password, label]) => (
              <tr key={email} className="border-t border-border">
                <td className="py-2 pr-3">{email}</td>
                <td className="pr-3">{password}</td>
                <td className="text-muted-foreground">{label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
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
