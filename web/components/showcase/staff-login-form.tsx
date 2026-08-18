"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { store } from "@/lib/showcase/store";
import type { DemoAccount } from "@/lib/showcase/demo-accounts";

/**
 * Email and password sign-in for the staff portal. Fake demo authentication:
 * the credentials are compared against the prefilled demo account right
 * here in the browser, and the resulting session lives in localStorage.
 * Nothing is verified or persisted server-side - acceptable because this is
 * a fictional demo portal. Every portal wraps this form in its own markup
 * and styles it through its own stylesheet.
 */
export function StaffLoginForm({
  homePath,
  className,
  buttonLabel = "Sign in",
  demoAccount,
}: {
  homePath: string;
  className?: string;
  buttonLabel?: string;
  demoAccount: DemoAccount;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(demoAccount.email);
  const [password, setPassword] = useState(demoAccount.password);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const match =
      email.trim().toLowerCase() === demoAccount.email && password === demoAccount.password;
    if (!match) {
      setBusy(false);
      setError("Sign-in failed. Please try again.");
      return;
    }
    store.setSchoolSession({
      email: demoAccount.email,
      name: demoAccount.name,
      signedInAt: new Date().toISOString(),
    });
    router.push(homePath);
  }

  return (
    <form className={className} onSubmit={submit}>
      <label>
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
      </label>
      <label>
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p className="login-error">{error}</p> : null}
      <button type="submit" disabled={busy}>
        {busy ? "Signing in…" : buttonLabel}
      </button>
    </form>
  );
}
