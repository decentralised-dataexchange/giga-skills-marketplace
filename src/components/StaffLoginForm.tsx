'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { authClient } from '@/lib/auth-client';
import { Drawer } from '@/components/Drawer';
import type { DemoAccount } from '@/lib/demo-accounts';

/**
 * Email and password sign-in for staff portals. Purely functional: every
 * portal wraps this in its own markup and styles it through its own
 * stylesheet, so the same form reads as a different product on each subpath.
 *
 * When a demo account is given, the screen shows it under the form and one
 * click fills both fields (the marketplace pattern): evaluators never have
 * to remember credentials.
 */
export function StaffLoginForm({
  homePath,
  className,
  buttonLabel = 'Sign in',
  demoAccount,
}: {
  homePath: string;
  className?: string;
  buttonLabel?: string;
  demoAccount?: DemoAccount;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    <>
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
      {demoAccount ? (
        <div className="demo-try">
          <p className="demo-try-line">
            Want to try it out?{' '}
            <button
              type="button"
              className="demo-try-link"
              onClick={() => setDrawerOpen(true)}
            >
              Use a demo account
            </button>
          </p>
        </div>
      ) : null}
      {demoAccount && drawerOpen ? (
        <Drawer
          title="Demo accounts"
          onClose={() => setDrawerOpen(false)}
          footer={
            <button type="button" onClick={() => setDrawerOpen(false)}>
              Close
            </button>
          }
        >
          <p className="drawer-hint">Click an account to fill the sign-in form.</p>
          <ul className="drawer-accounts">
            <li>
              <button
                type="button"
                onClick={() => {
                  setEmail(demoAccount.email);
                  setPassword(demoAccount.password);
                  setError(null);
                  setDrawerOpen(false);
                }}
              >
                <span className="demo-account-creds">
                  {demoAccount.email} · {demoAccount.password}
                </span>
                <span className="demo-account-label">{demoAccount.label}</span>
              </button>
            </li>
          </ul>
        </Drawer>
      ) : null}
    </>
  );
}
