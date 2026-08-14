import type { Metadata } from 'next';

import { getNextStop } from '@/lib/next-stop';
import { ensureSeeded } from '@/lib/seed';
import { ShowcaseGuide } from '@/components/ShowcaseGuide';

import './globals.css';

export const dynamic = 'force-dynamic';

const TITLE = 'National Learner Registry & Education Wallet Showcase';
const DESCRIPTION =
  'ITU/Giga education use case showcase: learner registration, credential issuance, wallet storage and third-party verification.';

function siteUrl(): URL {
  // Origin only: Next applies the deploy base path to asset routes itself,
  // so a path-carrying base would double the /showcase prefix.
  try {
    return new URL(new URL(process.env.PUBLIC_BASE_URL ?? '').origin);
  } catch {
    return new URL('http://localhost:3000');
  }
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: TITLE,
    type: 'website',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureSeeded();
  const nextStop = getNextStop();

  return (
    <html lang="en">
      <body>
        {children}
        <ShowcaseGuide nextStop={nextStop} />
      </body>
    </html>
  );
}
