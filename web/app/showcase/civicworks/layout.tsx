import { PORTALS, brandVars } from "@/lib/showcase/portals";

import "./civicworks.css";

export default function CivicworksLayout({ children }: { children: React.ReactNode }) {
  const portal = PORTALS.civicworks;
  return (
    <div className="cw" data-portal="civicworks" style={brandVars(portal)}>
      {children}
    </div>
  );
}
