import "server-only";

import { randomInt } from "crypto";

import { ows, requiredEnv } from "@/lib/showcase/server/ows";

/**
 * The OWS issuance broker of the showcase: Student ID, the paid diploma
 * (dynamic credential request behind the TS12 payment gate), and diploma
 * revocation. Stateless: the registry state machine lives in the browser
 * store, so every call takes the claim values as explicit input and returns
 * the offer for the browser to record.
 *
 * Identity is client-asserted: acceptable for this fictional single-browser
 * demo - the server holds no user state and every credential comes from a
 * sandbox.
 */

function clamp(value: unknown, max = 200): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- OWS answer shapes vary
function extractOffer(answer: any): { exchangeId: string; offer: string } {
  const history = Array.isArray(answer?.credentialHistory)
    ? answer.credentialHistory[0]
    : answer?.credentialHistory;
  const exchangeId: string | undefined =
    history?.credentialExchangeId ?? history?.CredentialExchangeId;
  const offer: string | undefined = history?.credentialOffer;
  if (!exchangeId || !offer) {
    throw new Error("The wallet service did not return a credential offer.");
  }
  return { exchangeId, offer };
}

export type StudentIdClaims = {
  ulid: string;
  firstName: string;
  familyName: string;
  displayName: string;
  dateOfBirth: string;
  email: string;
};

/**
 * Issue the Verifiable Student ID as a pre-authorised offer with a
 * transaction code: the learner types the PIN in the wallet when accepting.
 */
export async function issueStudentIdCredential(
  input: StudentIdClaims,
): Promise<{ exchangeId: string; offer: string; pin: string }> {
  const ulid = clamp(input.ulid, 40);
  if (!/^ULID-[0-9A-Z]{16}$/.test(ulid)) throw new Error("Invalid learner identifier.");
  const displayName = clamp(input.displayName) || "Learner";
  const pin = String(randomInt(1000, 10000));

  const answer = await ows(
    "moe",
    "POST",
    "/v2/config/digital-wallet/openid/sdjwt/credential/issue",
    {
      issuanceMode: "InTime",
      credentialDefinitionId: requiredEnv("STUDENT_ID_CREDENTIAL_ID", "Student ID issuance"),
      urlScheme: "openid-credential-offer://",
      userPin: pin,
      credential: {
        vct: "VerifiableStudentID",
        claims: {
          id: ulid,
          identifier: ulid,
          firstName: clamp(input.firstName),
          familyName: clamp(input.familyName),
          commonName: displayName,
          displayName,
          dateOfBirth: clamp(input.dateOfBirth, 40),
          mail: clamp(input.email),
          eduPersonPrincipalName: `${ulid.toLowerCase()}@nlr.gov.example`,
          eduPersonPrimaryAffiliation: "student",
          eduPersonAffiliation: ["student", "member"],
          eduPersonScopedAffiliation: ["student@riverside.school.example"],
          eduPersonAssurance: ["https://refeds.org/assurance/IAP/medium"],
          schacHomeOrganization: "riverside.school.example",
          schacPersonalUniqueID: `urn:schac:personalUniqueID:example:ULID:${ulid}`,
          schacPersonalUniqueCode: [`urn:schac:personalUniqueCode:example:nlr:${ulid}`],
        },
      },
    },
  );

  const { exchangeId, offer } = extractOffer(answer);
  return { exchangeId, offer, pin };
}

export type DiplomaClaims = {
  applicationId: string;
  learnerName: string;
  programme: string;
  qualificationCode: string;
  result: string;
  awardingInstitution: string;
  ulid: string;
  graduationDecisionHash: string;
};

/**
 * Start the paid diploma issuance as a DYNAMIC CREDENTIAL REQUEST: one QR.
 * The wallet first presents the chosen TS12 payment credential (account or
 * card) with the diploma-fee transaction data, and the diploma then issues
 * automatically in the same session. No user PIN: the protocol forbids one
 * on a dynamic request.
 */
export async function issueDiplomaWithPayment(
  input: DiplomaClaims,
  method: "account" | "card",
): Promise<{ exchangeId: string; qrUri: string }> {
  const answer = await ows(
    "moe",
    "POST",
    "/v2/config/digital-wallet/openid/sdjwt/credential/issue",
    {
      issuanceMode: "InTime",
      credentialDefinitionId: requiredEnv("DIPLOMA_CREDENTIAL_ID", "Diploma issuance"),
      urlScheme: "openid-credential-offer://",
      // Presentation during issuance: the payment credential of the chosen
      // method must be presented before the diploma is released.
      presentationDefinitionId: requiredEnv(
        method === "card"
          ? "PAYMENT_CARD_PRESENTATION_DEFINITION_ID"
          : "PAYMENT_PRESENTATION_DEFINITION_ID",
        "Payment confirmation",
      ),
      // The TS12 payment transaction data lives under `payload`, the shape
      // the platform validates. The payee and amount stay server-side.
      transactionData: {
        payload: {
          transaction_id: clamp(input.applicationId, 36),
          date_time: new Date().toISOString(),
          payee: {
            name: "Ministry of Education",
            id: "ESR-MOE-0001",
            // The sandbox organisation's seal, so the wallet shows the
            // Ministry rather than an initial avatar.
            logo: "https://demo-api.igrant.io/v2/onboard/image/6a7f19bed22651ae4335d9a9/web",
            website: "https://giga-staging.igrant.io/showcase",
          },
          execution_date: new Date().toISOString().slice(0, 10),
          currency: "EUR",
          amount: 50,
        },
      },
      credential: {
        vct: "urn:education:diploma:1",
        claims: {
          learnerName: clamp(input.learnerName),
          qualificationName: clamp(input.programme),
          qualificationCode: clamp(input.qualificationCode),
          awardingInstitution: clamp(input.awardingInstitution),
          awardDate: new Date().toISOString().slice(0, 10),
          programme: clamp(input.programme),
          result: clamp(input.result),
          ulid: clamp(input.ulid, 40),
          graduationDecisionHash: clamp(input.graduationDecisionHash, 64),
        },
      },
    },
  );

  const { exchangeId, offer } = extractOffer(answer);
  return { exchangeId, qrUri: offer };
}

/**
 * Permanently revoke an issued diploma by its credential exchange id.
 * A fresh employer verification must reject the credential afterwards.
 */
export async function revokeDiplomaCredential(owsExchangeId: string): Promise<void> {
  await ows(
    "moe",
    "PUT",
    `/v2/config/digital-wallet/openid/sdjwt/credential/history/${encodeURIComponent(owsExchangeId)}/revocation-status`,
    { revocationStatus: "Revoked" },
  );
}
