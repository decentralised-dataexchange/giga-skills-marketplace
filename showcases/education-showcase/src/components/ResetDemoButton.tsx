'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { resetDemo } from '@/app/reset-action';

/**
 * The landing-page reset control: a working state while the wipe runs, and
 * a clear confirmation when it is done.
 */
export function ResetDemoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    setBusy(true);
    setDone(false);
    setError(null);
    try {
      await resetDemo();
      setDone(true);
      router.refresh();
    } catch {
      setError('The reset failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="landing-reset-button"
        onClick={reset}
        disabled={busy}
      >
        {busy ? (
          <>
            <Loader2 size={15} className="landing-reset-spin" />
            Resetting…
          </>
        ) : (
          'Reset demo data'
        )}
      </button>
      {done ? (
        <p className="landing-reset-done" role="status">
          <CheckCircle2 size={15} />
          Demo data was reset. The showcase is ready for a fresh run.
        </p>
      ) : null}
      {error ? (
        <p className="landing-reset-error" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
