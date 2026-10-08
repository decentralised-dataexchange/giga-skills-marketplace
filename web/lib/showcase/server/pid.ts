import "server-only";

import { createHmac } from "crypto";

import { ows, owsLog, requiredEnv } from "@/lib/showcase/server/ows";

/**
 * The learner wallet login, server side. Stateless by design: the browser
 * starts the OpenID4VP request, polls the exchange's relay, and then
 * asks this module to complete it. Completion reads the verification record
 * from OWS, checks `verified === true`, and derives a pairwise pseudonym
 * from stable PID claims (an HMAC with a server pepper; the pepper never
 * leaves the server, and no raw PID attribute is stored anywhere
 * server-side). The browser stores the resulting fake session and the
 * transient form prefill in its own localStorage.
 */

export type PidClaims = {
  givenName: string;
  familyName: string;
  birthdate: string;
  email: string;
  address: string;
};

function claimString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value) return value;
  }
  return "";
}

/** One readable line out of the PID address object. */
function formatAddress(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const address = value as Record<string, unknown>;
  return ["street_address", "locality", "region", "postal_code", "country"]
    .map((part) => address[part])
    .filter((part): part is string => typeof part === "string" && part !== "")
    .join(", ");
}

/** Pull the PID claims out of the disclosed presentation array. */
export function extractPidClaims(presentation: unknown): PidClaims | null {
  const items = Array.isArray(presentation) ? presentation : [presentation];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const claims = item as Record<string, unknown>;
    const givenName = claimString(claims, ["given_name", "givenName"]);
    const familyName = claimString(claims, ["family_name", "familyName"]);
    const birthdate = claimString(claims, ["birthdate", "birth_date"]);
    const email = claimString(claims, ["email", "email_address"]);
    const address = formatAddress(claims.address ?? claims.resident_address);
    if (givenName || familyName) {
      return { givenName, familyName, birthdate, email, address };
    }
  }
  return null;
}

/** Pairwise pseudonym: HMAC of the stable claims with a server pepper. */
function pseudonym(claims: PidClaims): string {
  const pepper = process.env.LEARNER_PSEUDONYM_PEPPER || "";
  return createHmac("sha256", pepper)
    .update([claims.givenName, claims.familyName, claims.birthdate].join("|"))
    .digest("hex");
}

/**
 * Start a PID wallet login: send the OpenID4VP request from the Ministry
 * sandbox and hand the QR content to the browser.
 */
export async function startPidLoginRequest(): Promise<{ exchangeId: string; qrUri: string }> {
  const presentationDefinitionId = requiredEnv("PID_PRESENTATION_DEFINITION_ID", "PID login");

  const answer = await ows(
    "moe",
    "POST",
    "/v3/config/digital-wallet/openid/sdjwt/verification/send",
    // By reference: the QR carries a request_uri, not the whole request.
    { presentationDefinitionId, requestByReference: true },
  );

  const history = answer?.verificationHistory ?? answer;
  const exchangeId: string | undefined = history?.presentationExchangeId;
  const qrUri: string | undefined = history?.vpTokenQrCode;
  if (!exchangeId || !qrUri) {
    throw new Error("The wallet service could not start the sign-in.");
  }
  return { exchangeId, qrUri };
}

export type PidLoginResult = {
  pseudonym: string;
  displayName: string;
  /** Transient form prefill; the browser clears it at submission. */
  prefill: { dateOfBirth: string; email: string; address: string };
};

/**
 * Complete a PID login exchange: check the OWS record and return the
 * pairwise identity. Returns null when the presentation did not verify.
 * Safe to call more than once per exchange.
 */
export async function completePidLoginRequest(
  presentationExchangeId: string,
): Promise<PidLoginResult | null> {
  const record = await ows(
    "moe",
    "GET",
    `/v3/config/digital-wallet/openid/sdjwt/verification/history/${presentationExchangeId}`,
  );

  const history = record?.verificationHistory ?? record;
  if (history?.verified !== true) {
    owsLog("warn", `PID login ${presentationExchangeId}: not verified`);
    return null;
  }

  const claims = extractPidClaims(history.presentation);
  if (!claims) {
    owsLog("warn", `PID login ${presentationExchangeId}: no usable claims`);
    return null;
  }

  const displayName = [claims.givenName, claims.familyName].filter(Boolean).join(" ") || "Learner";
  return {
    pseudonym: pseudonym(claims),
    displayName,
    prefill: {
      dateOfBirth: claims.birthdate,
      email: claims.email,
      address: claims.address,
    },
  };
}
