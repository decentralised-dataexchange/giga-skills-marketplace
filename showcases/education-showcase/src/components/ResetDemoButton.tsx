'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, X } from 'lucide-react';

import { resetDemo } from '@/app/reset-action';

/**
 * The landing-page reset control: a working state while the wipe runs, and
 * a floating notification alert when it is done.
 */
export function ResetDemoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<'success' | 'error' | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function reset() {
    setBusy(true);
    setToast(null);
    try {
      await resetDemo();
      setToast('success');
      router.refresh();
    } catch {
      setToast('error');
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

      {mounted && toast
        ? createPortal(
            <div
              className={`toast ${toast === 'success' ? 'toast-success' : 'toast-error'}`}
              role="alert"
            >
              {toast === 'success' ? <CheckCircle2 size={18} /> : null}
              <span>
                {toast === 'success'
                  ? 'Demo data was reset. The showcase is ready for a fresh run.'
                  : 'The reset failed. Please try again.'}
              </span>
              <button
                type="button"
                aria-label="Dismiss"
                className="toast-close"
                onClick={() => setToast(null)}
              >
                <X size={15} />
              </button>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
