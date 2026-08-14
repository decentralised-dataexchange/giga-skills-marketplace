import { PORTALS, brandVars } from '@/lib/portals';

import './moe.css';

export default function MoeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const portal = PORTALS.moe;
  return (
    <div className="moe" data-portal="moe" style={brandVars(portal)}>
      {children}
    </div>
  );
}
