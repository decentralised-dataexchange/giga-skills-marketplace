'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { authClient } from '@/lib/auth-client';

/**
 * Email and password sign-in for staff portals. Purely functional: every
 * portal wraps this in its own markup and styles it through its own
 * stylesheet, so the same form reads as a different product on each subpath.
 */
export function StaffLoginForm({
  homePath,
  className,
  buttonLabel = 'Sign in',
}: {
  homePath: string;
  className?: string;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    setBusy(false);
    if (signInError) {
      setError(signInError.message ?? 'Sign-in failed. Please try again.');
      return;
    }
    router.push(homePath);
    router.refresh();
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
        {busy ? 'Signing in…' : buttonLabel}
      </button>
    </form>
  );
}
