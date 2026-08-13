import { PORTALS, brandVars } from '@/lib/portals';

import './school.css';

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const portal = PORTALS.school;
  return (
    <div className="sch" data-portal="school" style={brandVars(portal)}>
      {children}
    </div>
  );
}
