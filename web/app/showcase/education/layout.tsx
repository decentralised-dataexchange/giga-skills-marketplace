import { PORTALS, brandVars } from "@/lib/showcase/portals";

import "./education.css";

/** Brand wrapper only; the guard lives in the (app) group layout. */
export default function EducationLayout({ children }: { children: React.ReactNode }) {
  const portal = PORTALS.education;
  return (
    <div className="edu" data-portal="education" style={brandVars(portal)}>
      {children}
    </div>
  );
}
