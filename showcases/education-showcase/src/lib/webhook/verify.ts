import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify the OWS `X-iGrant-Signature: t=<ts>,sig=<hex>` header.
 *
 * sig = HMAC_SHA256(secret, "<t>.<raw body>"), hex-encoded, compared in
 * constant time. Returns false on any malformed or missing input.
 */
export function verifySignature(
  header: string | null | undefined,
  rawBody: string,
  secret: string,
): boolean {
  if (!header || !secret) return false;

  const parts: Record<string, string> = {};
  for (const kv of header.split(",")) {
    const i = kv.indexOf("=");
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  const t = parts["t"];
  const sig = parts["sig"];
  if (!t || !sig) return false;

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
