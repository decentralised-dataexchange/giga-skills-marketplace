import { PORTALS, brandVars } from '@/lib/portals';

import './dpa.css';

export default function DpaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const portal = PORTALS.dpa;
  return (
    <div className="dpa" data-portal="dpa" style={brandVars(portal)}>
      <div className="dpa-rule" />
      {children}
    </div>
  );
}
