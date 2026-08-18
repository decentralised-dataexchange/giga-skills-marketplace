#!/usr/bin/env node
/**
 * Idempotent OWS provisioning for the education showcase (served by the
 * marketplace app under /showcase).
 *
 * Needs in web/.env.local: MOE_IGRANT_API_KEY and CIVICWORKS_IGRANT_API_KEY
 * (keys bound to the two sandbox organisations). No webhook and no public
 * origin: the showcase polls the OWS exchange records directly.
 *
 * Creates, when missing:
 *   - MoE sandbox: the PID sign-in presentation definition and the TS12
 *     payment confirmation presentation definitions.
 *   - CivicWorks sandbox: the diploma qualification presentation definition.
 *
 * Writes the created ids back into web/.env.local when the variable is
 * empty. Run: node web/scripts/showcase-provision.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const ENV_PATH = new URL("../.env.local", import.meta.url).pathname;

function loadEnv() {
  const text = readFileSync(ENV_PATH, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }
  return { text, env };
}

function saveEnvValue(name, value) {
  let { text, env } = loadEnv();
  if (env[name]) return false;
  const pattern = new RegExp(`^${name}=$`, "m");
  if (pattern.test(text)) {
    text = text.replace(pattern, `${name}=${value}`);
  } else {
    text += `\n${name}=${value}\n`;
  }
  writeFileSync(ENV_PATH, text);
  return true;
}

const { env } = loadEnv();
const BASE = (env.IGRANT_BASE_URL || "https://demo-api.igrant.io").replace(/\/$/, "");

async function ows(key, method, path, body) {
  const init = {
    method,
    headers: {
      Authorization: `ApiKey ${key}`,
      "Content-Type": "application/json",
    },
  };
  if (body) init.body = JSON.stringify(body);
  const answer = await fetch(`${BASE}${path}`, init);
  const data = await answer.json().catch(() => null);
  if (!answer.ok) {
    throw new Error(
      `${method} ${path} -> HTTP ${answer.status}: ${JSON.stringify(data)?.slice(0, 400)}`,
    );
  }
  return data;
}

async function findPresentationDefinition(key, label) {
  const list = await ows(
    key,
    "GET",
    `/v2/config/digital-wallet/openid/sdjwt/presentation-definitions?search=${encodeURIComponent(label)}&limit=50`,
  );
  // The list answer nests the array under the singular key.
  const items = list?.presentationDefinition ?? list?.presentationDefinitions ?? [];
  return items.find((item) => (item.label ?? item.presentationDefinition?.label) === label);
}

async function ensurePresentationDefinition(key, definition) {
  const existing = await findPresentationDefinition(key, definition.label);
  if (existing) {
    const id =
      existing.presentationDefinitionId ?? existing.id ?? existing.presentationDefinition?.id;
    console.log(`= presentation definition "${definition.label}" exists: ${id}`);
    return id;
  }
  const created = await ows(
    key,
    "POST",
    "/v2/config/digital-wallet/openid/sdjwt/presentation-definition",
    definition,
  );
  const record = created?.presentationDefinition ?? created;
  const id = record?.presentationDefinitionId ?? record?.id;
  console.log(`+ presentation definition "${definition.label}" created: ${id}`);
  return id;
}

async function findCredentialDefinition(key, label) {
  const list = await ows(
    key,
    "GET",
    `/v2/config/digital-wallet/openid/sdjwt/credential-definitions?search=${encodeURIComponent(label)}&limit=50`,
  );
  const items = list?.credentialDefinition ?? list?.credentialDefinitions ?? [];
  return items.find((item) => item.label === label);
}

async function ensureCredentialDefinition(key, definition) {
  const existing = await findCredentialDefinition(key, definition.label);
  if (existing) {
    const id = existing.credentialDefinitionId ?? existing.id;
    console.log(`= credential definition "${definition.label}" exists: ${id}`);
    return id;
  }
  const created = await ows(
    key,
    "POST",
    "/v2/config/digital-wallet/openid/sdjwt/credential-definition",
    definition,
  );
  const record = created?.credentialDefinition ?? created;
  const id = record?.credentialDefinitionId ?? record?.id;
  console.log(`+ credential definition "${definition.label}" created: ${id}`);
  return id;
}

/** Claim path pointer entry: mandatory + selectively disclosable. */
function sd(path) {
  return { path, mandatory: true, limitDisclosure: true };
}

// The registry claim path pointers for VerifiableStudentID (2025.7.1).
const STUDENT_ID_CLAIMS = [
  ["commonName"],
  ["dateOfBirth"],
  ["displayName"],
  ["eduPersonAffiliation", null],
  ["eduPersonAssurance", null],
  ["eduPersonPrimaryAffiliation"],
  ["eduPersonPrincipalName"],
  ["eduPersonScopedAffiliation", null],
  ["familyName"],
  ["firstName"],
  ["id"],
  ["identifier"],
  ["mail"],
  ["schacHomeOrganization"],
  ["schacPersonalUniqueCode", null],
  ["schacPersonalUniqueID"],
].map(sd);

// The diploma models W3C VC 2.0 / Open Badges education fields semantically,
// carried as an OWS dc+sd-jwt credential for selective disclosure.
export const DIPLOMA_VCT = "urn:education:diploma:1";
const DIPLOMA_CLAIMS = [
  ["learnerName"],
  ["qualificationName"],
  ["qualificationCode"],
  ["awardingInstitution"],
  ["awardDate"],
  ["programme"],
  ["result"],
  ["ulid"],
  ["graduationDecisionHash"],
].map(sd);

async function main() {
  const moeKey = env.MOE_IGRANT_API_KEY;
  const cwKey = env.CIVICWORKS_IGRANT_API_KEY;

  if (!moeKey || !cwKey) {
    console.error(
      "MOE_IGRANT_API_KEY and CIVICWORKS_IGRANT_API_KEY must be set in .env.local first.",
    );
    process.exit(1);
  }

  // --- Ministry of Education sandbox -------------------------------------
  const pidId = await ensurePresentationDefinition(moeKey, {
    label: "Learner PID sign-in",
    version: "version_01",
    responseType: "vp_token",
    responseMode: "direct_post",
    // x509 with a dedicated key: the request is signed with this
    // definition's own certificate, granted on the NXD WRPAC trust list.
    clientIdScheme: "x509_hash",
    trustAnchor: "x509",
    kid: env.PID_VERIFY_KID || undefined,
    dcqlQuery: {
      credentials: [
        {
          id: "pid-login",
          format: "dc+sd-jwt",
          meta: { vct_values: ["urn:eu.europa.ec.eudi:pid:1"] },
          claims: [
            { path: ["given_name"] },
            { path: ["family_name"] },
            { path: ["birthdate"] },
            // Prefill the registration form: contact and address.
            { path: ["email"] },
            { path: ["address"] },
          ],
        },
      ],
    },
  });
  if (pidId) saveEnvValue("PID_PRESENTATION_DEFINITION_ID", pidId);

  const paymentId = await ensurePresentationDefinition(moeKey, {
    label: "Diploma fee payment confirmation",
    version: "version_01",
    responseType: "vp_token",
    responseMode: "direct_post",
    clientIdScheme: "x509_hash",
    trustAnchor: "x509",
    kid: env.PAYMENT_VERIFY_KID || undefined,
    // TS12 payment confirmation. At send time the request must carry
    // transactionData with transaction_id, payee{name,id}, currency, amount.
    transactionDataDefinitionType: "payment",
    dcqlQuery: {
      credentials: [
        {
          id: "payment-account",
          format: "dc+sd-jwt",
          // The vct of the demo Payment Account Credential issued by
          // igrant.io/demo/ts12-payment-credential-issuance.html (Piggy Bank
          // sandbox issuer on oid4vc.igrant.io).
          meta: {
            vct_values: ["https://oid4vc.igrant.io/service/vct-metadata/payment_account"],
          },
          claims: [{ path: ["iban"] }, { path: ["bic"] }, { path: ["currency"] }],
        },
      ],
    },
  });
  if (paymentId) saveEnvValue("PAYMENT_PRESENTATION_DEFINITION_ID", paymentId);

  const paymentCardId = await ensurePresentationDefinition(moeKey, {
    label: "Diploma fee payment confirmation (card)",
    version: "version_01",
    responseType: "vp_token",
    responseMode: "direct_post",
    clientIdScheme: "x509_hash",
    trustAnchor: "x509",
    kid: env.PAYMENT_VERIFY_KID || undefined,
    transactionDataDefinitionType: "payment",
    dcqlQuery: {
      credentials: [
        {
          // The TS12 Payment Card Credential of the same demo issuer.
          id: "payment-card",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["https://oid4vc.igrant.io/service/vct-metadata/card"],
          },
          claims: [{ path: ["pan_last_four"] }, { path: ["scheme"] }, { path: ["scheme_logo"] }],
        },
      ],
    },
  });
  if (paymentCardId) saveEnvValue("PAYMENT_CARD_PRESENTATION_DEFINITION_ID", paymentCardId);

  const studentIdDef = await ensureCredentialDefinition(moeKey, {
    label: "Verifiable Student ID",
    version: "version_01",
    // x509 with a dedicated key: credentials are signed with this
    // definition's own certificate, granted on the NXD Pub-EAA trust list.
    trustAnchor: "x509",
    kid: env.STUDENT_ID_KID || undefined,
    display: {
      name: "Student ID",
      description: "National Learner Registry student identity",
      backgroundColor: "#232f56",
      textColor: "#ffffff",
    },
    credentialDefinitions: [
      {
        credentialFormat: "dc+sd-jwt",
        vct: "VerifiableStudentID",
        validationPath: "$",
        claims: { claims: STUDENT_ID_CLAIMS },
        supportRevocation: true,
        expirationInDays: 1825,
      },
    ],
  });
  if (studentIdDef) saveEnvValue("STUDENT_ID_CREDENTIAL_ID", studentIdDef);

  const diplomaDef = await ensureCredentialDefinition(moeKey, {
    label: "National Diploma",
    version: "version_01",
    trustAnchor: "x509",
    kid: env.DIPLOMA_KID || undefined,
    // Needed for the dynamic credential request: the payment credential is
    // presented during issuance, and the diploma follows in one session.
    supportInteractiveAuthorisationEndpoint: true,
    display: {
      name: "Diploma",
      description: "Ministry of Education diploma credential",
      backgroundColor: "#1d4e89",
      textColor: "#ffffff",
    },
    credentialDefinitions: [
      {
        credentialFormat: "dc+sd-jwt",
        vct: DIPLOMA_VCT,
        validationPath: "$",
        claims: { claims: DIPLOMA_CLAIMS },
        supportRevocation: true,
        expirationInDays: 3650,
      },
    ],
  });
  if (diplomaDef) saveEnvValue("DIPLOMA_CREDENTIAL_ID", diplomaDef);

  // CivicWorks job application: the PID fills the personal fields, the
  // diploma is the qualification evidence. Five diploma claims only.
  const diplomaVerifyId = await ensurePresentationDefinition(cwKey, {
    label: "Diploma qualification check",
    version: "version_01",
    responseType: "vp_token",
    responseMode: "direct_post",
    clientIdScheme: "x509_hash",
    trustAnchor: "x509",
    kid: env.DIPLOMA_CHECK_KID || undefined,
    dcqlQuery: {
      credentials: [
        {
          id: "pid",
          format: "dc+sd-jwt",
          meta: { vct_values: ["urn:eu.europa.ec.eudi:pid:1"] },
          claims: [{ path: ["given_name"] }, { path: ["family_name"] }, { path: ["email"] }],
        },
        {
          id: "diploma",
          format: "dc+sd-jwt",
          meta: { vct_values: [DIPLOMA_VCT] },
          claims: [
            { path: ["learnerName"] },
            { path: ["qualificationName"] },
            { path: ["qualificationCode"] },
            { path: ["awardingInstitution"] },
            { path: ["awardDate"] },
          ],
        },
      ],
    },
  });
  if (diplomaVerifyId) saveEnvValue("DIPLOMA_PRESENTATION_DEFINITION_ID", diplomaVerifyId);

  console.log("Provisioning finished.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
