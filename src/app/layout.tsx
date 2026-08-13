import type { Metadata } from 'next';

import { ensureSeeded } from '@/lib/seed';
import { PortalSwitcher } from '@/components/PortalSwitcher';

import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'National Learner Registry & Education Wallet Showcase',
  description:
    'ITU/Giga education use case showcase: learner registration, credential issuance, wallet storage and third-party verification.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureSeeded();

  return (
    <html lang="en">
      <body>
        {children}
        <PortalSwitcher />
      </body>
    </html>
  );
}
