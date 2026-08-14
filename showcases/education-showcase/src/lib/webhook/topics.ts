/**
 * OWS digital-wallet webhook topics and exchange-id extraction.
 * The Ministry sandbox registers both lists (it issues and verifies);
 * the CivicWorks sandbox registers the verifier list.
 */

export const ISSUER_TOPICS = [
  'openid.credential.offer_received',
  'openid.credential.token_issued',
  'openid.credential.credential_acked',
  'openid.credential.credential_accepted',
] as const;

export const VERIFIER_TOPICS = [
  'openid.presentation.presentation_acked.v3',
  'digitalwallet.presentation.verified',
] as const;

const TOPIC_PATHS: Record<string, [string, string]> = {
  'openid.presentation.presentation_acked.v3': ['presentation', 'presentationExchangeId'],
  'digitalwallet.presentation.verified': ['presentation', 'presentationExchangeId'],
  'openid.credential.offer_received': ['credential', 'CredentialExchangeId'],
  'openid.credential.token_issued': ['credential', 'CredentialExchangeId'],
  'openid.credential.credential_acked': ['credential', 'CredentialExchangeId'],
  'openid.credential.credential_accepted': ['credential', 'CredentialExchangeId'],
};

export function isSupportedTopic(type: unknown): type is string {
  return typeof type === 'string' && type in TOPIC_PATHS;
}

export function extractExchangeId(
  type: string,
  data: Record<string, unknown>
): string | undefined {
  const path = TOPIC_PATHS[type];
  if (!path) return undefined;
  let cur: unknown = data;
  for (const field of path) {
    if (cur && typeof cur === 'object' && field in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[field];
    } else {
      return undefined;
    }
  }
  return cur == null ? undefined : String(cur);
}
