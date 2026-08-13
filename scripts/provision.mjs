#!/usr/bin/env node
/**
 * Idempotent OWS provisioning for the education showcase.
 *
 * Needs in .env.local: MOE_IGRANT_API_KEY, CIVICWORKS_IGRANT_API_KEY (keys
 * bound to the two sandbox organisations), MOE_WEBHOOK_SECRET,
 * CIVICWORKS_WEBHOOK_SECRET, PUBLIC_BASE_URL.
 *
 * Creates, when missing:
 *   - MoE sandbox: the PID sign-in presentation definition, the TS12 payment
 *     confirmation presentation definition, and the webhook (issuer +
 *     verifier topics).
 *   - CivicWorks sandbox: the webhook (verifier topics). The diploma
 *     presentation definition is created by provision-credentials.mjs once
 *     the diploma credential definition exists.
 *
 * Writes the created ids back into .env.local when the variable is empty.
 * Run: node scripts/provision.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const ENV_PATH = new URL('../.env.local', import.meta.url).pathname;

function loadEnv() {
  const text = readFileSync(ENV_PATH, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }
  return { text, env };
}

function saveEnvValue(name, value) {
  let { text, env } = loadEnv();
  if (env[name]) return false;
  const pattern = new RegExp(`^${name}=$`, 'm');
  if (pattern.test(text)) {
    text = text.replace(pattern, `${name}=${value}`);
  } else {
    text += `\n${name}=${value}\n`;
  }
  writeFileSync(ENV_PATH, text);
  return true;
}

const { env } = loadEnv();
const BASE = (env.IGRANT_BASE_URL || 'https://demo-api.igrant.io').replace(/\/$/, '');

async function ows(key, method, path, body) {
  const answer = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `ApiKey ${key}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await answer.json().catch(() => null);
  if (!answer.ok) {
    throw new Error(
      `${method} ${path} -> HTTP ${answer.status}: ${JSON.stringify(data)?.slice(0, 400)}`
    );
  }
  return data;
}

async function findPresentationDefinition(key, label) {
  const list = await ows(
    key,
    'GET',
    `/v2/config/digital-wallet/openid/sdjwt/presentation-definitions?search=${encodeURIComponent(label)}&limit=50`
  );
  // The list answer nests the array under the singular key.
  const items =
    list?.presentationDefinition ?? list?.presentationDefinitions ?? [];
  return items.find(
    (item) => (item.label ?? item.presentationDefinition?.label) === label
  );
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
    'POST',
    '/v2/config/digital-wallet/openid/sdjwt/presentation-definition',
    definition
  );
  const record = created?.presentationDefinition ?? created;
  const id = record?.presentationDefinitionId ?? record?.id;
  console.log(`+ presentation definition "${definition.label}" created: ${id}`);
  return id;
}

const ISSUER_TOPICS = [
  'openid.credential.offer_received',
  'openid.credential.token_issued',
  'openid.credential.credential_acked',
  'openid.credential.credential_accepted',
];
const VERIFIER_TOPICS = [
  'openid.presentation.presentation_acked.v3',
  'digitalwallet.presentation.verified',
];

async function ensureWebhook(key, payloadUrl, secretKey, topics) {
  const list = await ows(key, 'GET', '/v2/config/webhooks?limit=100&offset=0');
  const items = list?.webhooks ?? list?.items ?? list?.data ?? [];
  const exists = items.some(
    (item) => (item.payloadUrl ?? item.webhook?.payloadUrl) === payloadUrl
  );
  if (exists) {
    console.log(`= webhook ${payloadUrl} exists`);
    return;
  }
  await ows(key, 'POST', '/v2/config/webhook', {
    webhook: {
      payloadUrl,
      contentType: 'application/json',
      subscribedEvents: { digitalWalletWebhook: topics },
      disabled: false,
      secretKey,
      skipSslVerification: false,
    },
  });
  console.log(`+ webhook ${payloadUrl} created`);
}

async function main() {
  const moeKey = env.MOE_IGRANT_API_KEY;
  const cwKey = env.CIVICWORKS_IGRANT_API_KEY;
  const publicBase = (env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

  if (!moeKey || !cwKey) {
    console.error(
      'MOE_IGRANT_API_KEY and CIVICWORKS_IGRANT_API_KEY must be set in .env.local first.'
    );
    process.exit(1);
  }

  // Webhook secrets: generate once when empty.
  for (const name of ['MOE_WEBHOOK_SECRET', 'CIVICWORKS_WEBHOOK_SECRET']) {
    if (!env[name]) {
      const secret = randomBytes(32).toString('hex');
      saveEnvValue(name, secret);
      env[name] = secret;
      console.log(`+ generated ${name}`);
    }
  }

  // --- Ministry of Education sandbox -------------------------------------
  const pidId = await ensurePresentationDefinition(moeKey, {
    label: 'Learner PID sign-in',
    version: 'version_01',
    responseType: 'vp_token',
    responseMode: 'direct_post',
    dcqlQuery: {
      credentials: [
        {
          id: 'pid-login',
          format: 'dc+sd-jwt',
          meta: { vct_values: ['urn:eu.europa.ec.eudi:pid:1'] },
          claims: [
            { path: ['given_name'] },
            { path: ['family_name'] },
            { path: ['birthdate'] },
          ],
        },
      ],
    },
  });
  if (pidId) saveEnvValue('PID_PRESENTATION_DEFINITION_ID', pidId);

  const paymentId = await ensurePresentationDefinition(moeKey, {
    label: 'Diploma fee payment confirmation',
    version: 'version_01',
    responseType: 'vp_token',
    responseMode: 'direct_post',
    // TS12 payment confirmation. At send time the request must carry
    // transactionData with transaction_id, payee{name,id}, currency, amount.
    transactionDataDefinitionType: 'payment',
    dcqlQuery: {
      credentials: [
        {
          id: 'payment-account',
          format: 'dc+sd-jwt',
          // The vct of the demo Payment Account Credential issued by
          // igrant.io/demo/ts12-payment-credential-issuance.html (Piggy Bank
          // sandbox issuer on oid4vc.igrant.io).
          meta: {
            vct_values: [
              'https://oid4vc.igrant.io/service/vct-metadata/payment_account',
            ],
          },
          claims: [
            { path: ['iban'] },
            { path: ['bic'] },
            { path: ['currency'] },
          ],
        },
      ],
    },
  });
  if (paymentId) saveEnvValue('PAYMENT_PRESENTATION_DEFINITION_ID', paymentId);

  if (publicBase && !publicBase.includes('localhost')) {
    await ensureWebhook(
      moeKey,
      `${publicBase}/api/webhooks/ows/moe`,
      env.MOE_WEBHOOK_SECRET,
      [...ISSUER_TOPICS, ...VERIFIER_TOPICS]
    );
    await ensureWebhook(
      cwKey,
      `${publicBase}/api/webhooks/ows/civicworks`,
      env.CIVICWORKS_WEBHOOK_SECRET,
      VERIFIER_TOPICS
    );
  } else {
    console.log(
      '! PUBLIC_BASE_URL is localhost: webhooks skipped (use a tunnel, then rerun).'
    );
  }

  console.log('Provisioning finished.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
