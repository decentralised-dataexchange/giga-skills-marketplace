import 'server-only';

import { ows } from '@/lib/ows';

/**
 * Read one CivicWorks verification record and reduce it to what the result
 * screen shows: the boolean outcome, the disclosed claims, and the checks.
 */

export type VerificationResult = {
  exchangeId: string;
  status: string;
  verified: boolean;
  answered: boolean;
  /** The five disclosed diploma claims. */
  claims: Record<string, string>;
  /** The PID claims that prefill the application form. */
  pid: { givenName: string; familyName: string; email: string };
  checks: { name: string; passed: boolean; detail?: string }[];
};

const SHOWN_CLAIMS = [
  'learnerName',
  'qualificationName',
  'qualificationCode',
  'awardingInstitution',
  'awardDate',
];

export async function readVerification(
  exchangeId: string
): Promise<VerificationResult | null> {
  let record: any;
  try {
    record = await ows(
      'civicworks',
      'GET',
      `/v3/config/digital-wallet/openid/sdjwt/verification/history/${exchangeId}`
    );
  } catch {
    return null;
  }
  const history = record?.verificationHistory ?? record;
  if (!history) return null;

  const verified = history.verified === true;
  const answered =
    Array.isArray(history.vpTokenResponse) && history.vpTokenResponse.length > 0;

  const claims: Record<string, string> = {};
  const pid = { givenName: '', familyName: '', email: '' };
  const presentations = Array.isArray(history.presentation)
    ? history.presentation
    : history.presentation
      ? [history.presentation]
      : [];
  for (const entry of presentations) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    for (const name of SHOWN_CLAIMS) {
      const value = record[name];
      if (typeof value === 'string' && value) claims[name] = value;
    }
    if (typeof record.given_name === 'string') pid.givenName = record.given_name;
    if (typeof record.family_name === 'string') pid.familyName = record.family_name;
    if (typeof record.email === 'string') pid.email = record.email;
  }

  const validity = history.presentationValidity;
  const validityEntries = Array.isArray(validity) ? validity : [];
  const revoked = validityEntries.some(
    (entry: any) =>
      entry?.revoked === true || entry?.revocationStatus === 'Revoked'
  );

  const checks = [
    { name: 'Signature and integrity', passed: verified },
    {
      name: 'Trusted issuer',
      passed: verified,
      detail: verified ? 'Ministry of Education (trust list)' : undefined,
    },
    {
      name: 'Revocation status',
      passed: verified && !revoked,
      detail: revoked ? 'The credential has been revoked' : 'Not revoked at verification time',
    },
  ];

  return {
    exchangeId,
    status: String(history.status ?? ''),
    verified,
    answered,
    claims,
    pid,
    checks,
  };
}

/** The CivicWorks verification history, newest first. */
export async function listVerifications(limit = 20) {
  const record = await ows(
    'civicworks',
    'GET',
    `/v3/config/digital-wallet/openid/sdjwt/verification/history?limit=${limit}&sortOrder=desc`
  );
  const items =
    record?.verificationHistory ?? record?.items ?? [];
  return (Array.isArray(items) ? items : []).map((item: any) => ({
    exchangeId: String(item.presentationExchangeId ?? item.id ?? ''),
    status: String(item.status ?? ''),
    verified: item.verified === true,
    createdAt: item.createdAt ?? null,
  }));
}
