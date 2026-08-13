import Link from 'next/link';

import { CivicworksShell } from '@/components/CivicworksShell';
import { listVerifications } from '@/lib/verification';

export default async function CivicworksHistory() {
  let items: Awaited<ReturnType<typeof listVerifications>> = [];
  try {
    items = await listVerifications(25);
  } catch {
    items = [];
  }

  return (
    <CivicworksShell active="history">
      <h1>Verification history</h1>
      <p className="cw-lede">
        Every verification this workspace has run, with its outcome at the
        time of checking. Data comes live from the wallet service{' '}
        <span className="integration-badge real">Real</span>.
      </p>
      <div className="cw-cards" style={{ gridTemplateColumns: '1fr' }}>
        {items.length === 0 ? (
          <div className="cw-card">
            <h2>No verifications yet</h2>
            <p>Completed verifications appear here.</p>
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.exchangeId}
              href={`/civicworks/verify?ex=${item.exchangeId}`}
              className="cw-card"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <h2 style={{ color: item.verified ? 'var(--ok)' : 'var(--muted)' }}>
                {item.verified ? 'Verified' : item.status.replace(/_/g, ' ')}
              </h2>
              <p>
                Exchange {item.exchangeId.slice(0, 8)}…
                {item.createdAt ? ` · ${String(item.createdAt).slice(0, 10)}` : ''}
              </p>
            </Link>
          ))
        )}
      </div>
    </CivicworksShell>
  );
}
