import { NextResponse, type NextRequest } from "next/server";

// Earlier hostnames of the marketplace (comma-separated) and the current site
// URL, both set by the Helm chart. A request to an earlier hostname gets a
// permanent redirect to the same path and query on the current site, so old
// links keep working. The ingress controller refuses redirect annotations that
// keep the path, so the app does it.
const redirectHosts = new Set(
  (process.env.REDIRECT_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean),
);
const siteUrl = process.env.SITE_URL;

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  if (!siteUrl || !host || !redirectHosts.has(host)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(pathname + search, siteUrl), 308);
}
