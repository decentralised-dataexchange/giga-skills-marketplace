import { auth } from "@/lib/auth";

const DEPLOY_PREFIX = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Hand requests to better-auth at its default /api/auth base. Under the
 * monolith deploy prefix the incoming URL may carry the prefix; strip it
 * so the handler matches regardless of how the runtime passes the path.
 */
function normalize(request: Request): Request {
  if (!DEPLOY_PREFIX) return request;
  const url = new URL(request.url);
  if (url.pathname.startsWith(`${DEPLOY_PREFIX}/`)) {
    url.pathname = url.pathname.slice(DEPLOY_PREFIX.length);
    return new Request(url, request);
  }
  return request;
}

export const GET = (request: Request) => auth.handler(normalize(request));
export const POST = (request: Request) => auth.handler(normalize(request));
