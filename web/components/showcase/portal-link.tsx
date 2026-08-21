import type { ReactNode } from "react";
import Link from "next/link";

import { PORTALS, type PortalId } from "@/lib/showcase/portals";

/**
 * A cross-reference from one showcase portal to another. When a portal's copy
 * names a different portal, wrap the name in this link so a demo user can jump
 * straight there. Pass `to` for one of the three portals (the href resolves
 * from the single portal registry), or `href` for a target outside a portal,
 * such as the registry audit trail. The link inherits the surrounding text
 * colour and weight and only adds an underline, so it reads as a link inside
 * any portal's palette without clashing.
 */
export function PortalLink({
  to,
  href,
  children,
}: {
  to?: PortalId;
  href?: string;
  children: ReactNode;
}) {
  const target = to ? PORTALS[to].publicPath : (href ?? "#");
  return (
    <Link href={target} style={{ color: "inherit", fontWeight: "inherit", textDecoration: "underline" }}>
      {children}
    </Link>
  );
}
