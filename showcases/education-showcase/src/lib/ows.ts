import "server-only";

/**
 * The single place where this application talks to the iGrant.io Organisation
 * Wallet Suite. Every call runs server-side and injects
 * `Authorization: ApiKey <key>`. The browser never sees a key or the OWS base
 * URL: it talks to server actions and route handlers, which come through here.
 *
 * Three key contexts:
 *   - 'moe'        the National Ministry of Education sandbox (issuer +
 *                  PID/TS12 verifier),
 *   - 'civicworks' the CivicWorks Employer sandbox (diploma verifier),
 *   - 'main'       the main tenant (sandbox provisioning, Consent BB).
 *
 * Sandbox keys are bound to their sandbox organisation, so no
 * X-SandboxOrgId header is needed at call time.
 */

export type OwsOrg = "moe" | "civicworks" | "main";

const KEY_ENV: Record<OwsOrg, string> = {
  moe: "MOE_IGRANT_API_KEY",
  civicworks: "CIVICWORKS_IGRANT_API_KEY",
  main: "IGRANT_API_KEY",
};

export function owsLog(level: "log" | "warn" | "error", msg: string) {
  const ts = new Date().toISOString();
  if (level === "warn") console.warn(`[OWS][${ts}] ${msg}`);
  else if (level === "error") console.error(`[OWS][${ts}] ${msg}`);
  else console.log(`[OWS][${ts}] ${msg}`);
}

/**
 * Convert an internal failure into a user-safe generic error, logging the
 * detail server-side. The client only ever sees the returned message.
 */
export function internalError(detail: string): Error {
  owsLog("error", `Server error: ${detail}`);
  return new Error("Something went wrong. Please try again.");
}

export function baseUrl(): string {
  const url = process.env.IGRANT_BASE_URL;
  if (!url) throw internalError("IGRANT_BASE_URL not configured");
  return url.replace(/\/$/, "");
}

function apiKey(org: OwsOrg): string {
  const key = process.env[KEY_ENV[org]];
  if (!key) throw internalError(`No OWS API key: ${KEY_ENV[org]} is not set`);
  return key;
}

/** Read a deployment-configured id by environment variable name. */
export function requiredEnv(name: string, what: string): string {
  const value = process.env[name];
  if (!value) throw internalError(`${what}: ${name} not configured`);
  return value;
}

/**
 * Call OWS as one of the three key contexts. `path` is the path only; the
 * base URL is added here so no caller can point a key at another host.
 */
export async function ows(
  org: OwsOrg,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: Record<string, unknown> | null,
): Promise<any> {
  const url = `${baseUrl()}${path}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `ApiKey ${apiKey(org)}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  };
  if (body) options.body = JSON.stringify(body);

  const resp = await fetch(url, options);

  let data: any = null;
  try {
    data = await resp.json();
  } catch {
    data = null;
  }

  if (!resp.ok) {
    owsLog(
      "error",
      `HTTP ${resp.status} ${method} ${path} [${org}] ${JSON.stringify(data)?.slice(0, 500)}`,
    );
    // Never surface the raw OWS error: it may carry internal detail.
    throw new Error("The wallet service could not complete the request. Please try again.");
  }

  return data;
}
