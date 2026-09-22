import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/site-url";

// Earlier hostnames of a deployment (comma-separated), set by the Helm chart
// from redirect.domains; empty by default, so a new deployment redirects
// nothing. A request to an earlier hostname gets a permanent redirect to the
// same path and query on SITE_URL, so old links keep working. The app does it
// because ingress-nginx refuses redirect annotations that keep the path.
const redirectHosts = new Set(
  (process.env.REDIRECT_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean),
);

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  if (!host || !redirectHosts.has(host)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(pathname + search, siteUrl()), 308);
}
