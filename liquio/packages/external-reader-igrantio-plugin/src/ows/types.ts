/**
 * Minimal types for the iGrant.io Organisation Wallet Suite (OWS) OpenID4VC API.
 *
 * NOTE: this `src/ows/` module is intentionally vendored (duplicated) in
 * `@liquio/event-igrantio-plugin` and `@liquio/external-reader-igrantio-plugin`
 * so that each plugin stays a single, self-contained npm package — the
 * `@liquio/plugin-installer` installs each plugin independently. Keep the two
 * copies in sync.
 */

/** Resolved connection settings for one OWS organisation. */
export interface OwsSettings {
  /** OWS base URL, e.g. `https://demo-api.igrant.io`. */
  baseUrl: string;
  /** Organisation API key, sent as `Authorization: ApiKey <key>`. */
  apiKey: string;
}

/** Allowed values for the revocation status update. */
export const REVOCATION_STATUSES = ["Operational", "Revoked", "Suspended"];

/** `credentialHistory` item returned by the issuance endpoints. */
export interface OwsCredentialHistory {
  /** Preferred camel-case correlation id; `CredentialExchangeId` is the same value. */
  credentialExchangeId?: string;
  CredentialExchangeId?: string;
  credentialOffer?: string;
  credentialStatus?: string;
  status?: string;
  credential?: {
    id?: string;
    claims?: Record<string, unknown>;
    credentialSubject?: Record<string, unknown>;
  };
  presentationExchangeId?: string;
  holder?: { name?: string };
  credentialFormat?: string;
  revocationStatus?: string;
}

/** `verificationHistory` item returned by the verification endpoints. */
export interface OwsVerificationHistory {
  presentationExchangeId?: string;
  vpTokenQrCode?: string;
  status?: string;
  verified?: boolean;
  vpTokenResponse?: string[];
  presentation?: Record<string, unknown>[];
  presentationSubmission?: unknown;
  holder?: { name?: string };
  dcApiRequest?: unknown;
  dcApiProtocol?: unknown;
  walletUnitAttestationVerified?: boolean;
  presentationValidity?: unknown;
  walletUnitValidity?: unknown;
}

export interface OwsIssueResponse {
  credentialHistory?: OwsCredentialHistory;
  [key: string]: unknown;
}

export interface OwsVerifyResponse {
  verificationHistory?: OwsVerificationHistory;
  [key: string]: unknown;
}

/** Issuance statuses that mean the wallet has taken the credential. */
export const ISSUANCE_DONE_STATUSES = [
  "credential_accepted",
  "credential_acked",
  "credential_issued",
  "token_issued",
];

/** Verification status that means the wallet has presented. */
export const VERIFICATION_DONE_STATUS = "presentation_acked";

/** Where the settings register record is read from. */
export interface SettingsRegisterOptions {
  /** Register service base URL, e.g. `http://register:3350`. */
  url: string;
  /** Register service auth token (same token the event service uses). */
  token: string;
  /** Register id of the settings register. */
  registerId: number;
  /** Register key id of the settings register key. */
  keyId: number;
  /** Optional `data.name` filter when the key holds several records. */
  recordName?: string;
  /** Cache TTL for the fetched settings, ms. Default 60000. */
  cacheTtlMs?: number;
}

/** Plugin options (`plugins.json` -> `options`). */
export interface IgrantPluginOptions {
  /** Hard override for the OWS base URL (skips the settings register). */
  baseUrl?: string;
  /** Hard override for the OWS API key (skips the settings register). */
  apiKey?: string;
  /** Where to read `{ baseUrl, apiKey }` from, editable in the Liquio admin UI. */
  settingsRegister?: SettingsRegisterOptions;
  /** HTTP timeout, ms. Default 20000. */
  timeout?: number;
  /** Log full request/response payloads. Never enable in production. */
  debug?: boolean;
}
