'use client';

import { useRouter } from 'next/navigation';

import { authClient } from '@/lib/auth-client';

export function SignOutButton({
  redirectTo,
  className,
}: {
  redirectTo: string;
  className?: string;
}) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button type="button" className={className} onClick={signOut}>
      Sign out
    </button>
  );
}
