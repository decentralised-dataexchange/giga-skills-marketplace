# @liquio/event-igrantio-plugin

An [iGrant.io Organisation Wallet Suite (OWS)](https://docs.igrant.io/docs/developer-apis)
external-service plugin for `components/event`, built on
[`@liquio/plugin-sdk`](../plugin-sdk). It lets workflow designers add digital-credential
steps to any Liquio BPMN process, without programming:

- **Issue** a credential into a citizen's EUDI wallet (OpenID4VCI).
- **Verify** a credential presented from a wallet (OpenID4VP + DCQL).
- **Check status** of a running exchange (for BPMN wait loops).

The companion pieces are [`@liquio/external-reader-igrantio-plugin`](../external-reader-igrantio-plugin)
(lets the cabinet form poll the exchange status) and the `igrant.credential` form
control in the cabinet (renders the wallet QR code and advances the task when the
wallet completes).

## Prerequisites

1. An iGrant.io organisation with an **OWS API key**
   (create one at <https://demo.igrant.io> or contact support@igrant.io).
2. A **credential definition** (for issuance) and/or a **presentation definition**
   (a stored DCQL query, for verification), created in the iGrant.io dashboard.
   Their IDs are what the analyst pastes into the event nodes.
3. The **settings register** in Liquio (see below) filled with the OWS base URL and
   API key.

## Installation

Add the plugin to `components/event`'s `plugins.json` (installed at container start by
`@liquio/plugin-installer`):

```json
{
  "pluginsDir": "/var/www/plugins",
  "plugins": [
    {
      "package": "@liquio/event-igrantio-plugin",
      "version": "0.1.0",
      "isEnabled": true,
      "name": "igrant",
      "options": {
        "settingsRegister": {
          "url": "http://register:8103",
          "token": "<register service token>",
          "registerId": 200,
          "keyId": 200
        }
      }
    }
  ]
}
```

Register it as an external-service provider in `config/event/requester.json`:

```json
{
  "externalService": {
    "igrant": { "providerType": "plugin", "pluginName": "igrant" }
  }
}
```

## Configuration: where the API key lives

The plugin reads `{ baseUrl, apiKey }` from a **settings register record** — a normal
Liquio register the organisation admin edits in the admin panel (Registers page). The
record `data` must carry:

```json
{ "name": "default", "baseUrl": "https://demo-api.igrant.io", "apiKey": "<OWS API key>" }
```

Reads are cached for 60 s, so admin edits apply within a minute without a restart.
Restrict the register to the admin unit with register access rules
(`config/task/register.json` → `access`).

> Security note: register records are stored in plaintext in Postgres. Hardened
> deployments should instead set `options.baseUrl` + `options.apiKey` directly in
> `plugins.json` (mounted from a secret); those values override the register.

Options reference (`IgrantPluginOptions` in `src/ows/types.ts`):

| Option | Meaning |
| --- | --- |
| `settingsRegister.url` | Register service base URL (`http://register:8103`). |
| `settingsRegister.token` | Register service auth token (same as `requester.json` → `registers.token`). |
| `settingsRegister.registerId` / `keyId` | Where the settings record lives. |
| `settingsRegister.recordName` | Optional `data.name` filter when the key holds several records. |
| `settingsRegister.cacheTtlMs` | Settings cache TTL, default 60000. |
| `baseUrl`, `apiKey` | Hard overrides; skip / override the register (default tenant only). |
| `timeout` | OWS HTTP timeout in ms, default 20000. |
| `debug` | Log full payloads (claims included) — never enable in production. |

## Usage in the workflow designer (for analysts)

Add an **event node** (`event-<eventTemplateId>`), set its type to **request**, and
paste one of the JSON5 snippets below into the event schema editor. Payload builders
must live under `sendToExternalService.options.<key>` — each value is a **function
string** `(document, event, documents, events) => …` evaluated on the workflow's data
(plain values are not accepted there). Keep `providerName: "igrant"` and select the
operation with `options.operation` — the dotted `providerName: "igrant.issue"` form
does not work with plugins, because the event service then also looks the method up
on the standard payload decorator.

### Issue a credential

```json5
{
  sendToExternalService: {
    providerName: "igrant",
    service: "igrant",
    options: {
      operation: "() => 'issue'",
      credentialDefinitionId: "() => 'your-credential-definition-id'",
      issuanceMode: "() => 'InTime'",
      // Empty userPin selects the Pre-Authorized Code Flow (scan -> accept).
      // Leave the field out for the Authorization Code Flow instead.
      userPin: "() => ''",
      // Map workflow data to the credential claims:
      claims: "(document, event, documents, events) => ({ given_name: document.data.person.firstName, family_name: document.data.person.lastName })",
    },
  },
}
```

Result (readable by later nodes and forms):

```
events.<eventTemplateId>.data.result.sendToExternalService.sendingResult.response
  .exchangeId   — the CredentialExchangeId (also stamped on the document as externalId)
  .offerUri     — openid-credential-offer://… (render as QR in the next task)
  .status       — offer_sent → … → credential_accepted
```

### Verify a credential

```json5
{
  sendToExternalService: {
    providerName: "igrant",
    service: "igrant",
    options: {
      operation: "() => 'verify'",
      presentationDefinitionId: "() => 'your-presentation-definition-id'",
    },
  },
}
```

Result fields: `.exchangeId` (presentationExchangeId), `.qrUri` (`openid4vp://…`),
`.status`.

### Show the QR to the citizen

In the next task's document template, add a field whose value is filled from the
event, rendered by the `igrant.credential` control:

```json5
walletStep: {
  type: "object",
  description: "Share from your wallet",
  properties: {
    wallet: {
      type: "object",
      control: "igrant.credential",
      mode: "verify",                      // or "issue"
      checkService: "igrant",              // external-reader service name
      value: "({documents, events}) => { const r = events['<verifyEventTemplateId>'].data.result.sendToExternalService.sendingResult.response; return { uri: r.qrUri || r.offerUri, exchangeId: r.exchangeId }; }",
    },
  },
},
```

The control shows the QR + deep link, polls the exchange through
`@liquio/external-reader-igrantio-plugin`, writes `{ status, verified, claims }`
into the document, and advances the task when the wallet completes.

### Branch on the verification result (gateway condition)

```js
(documents, events) => {
  const doc = documents.find((d) => d.documentTemplateId === <walletTaskDocTemplateId>);
  return doc?.data?.walletStep?.wallet?.result?.verified === true;
}
```

### Prefill a form from disclosed claims

```json5
firstName: {
  type: "string",
  description: "First name",
  value: "documentData.walletStep.wallet.result.claims.given_name",
}
```

### Multiple tenants and sandbox organisations

The settings register holds **one record per tenant**: `data.name` identifies it
(`default`, `moe-sandbox`, …), each with its own `baseUrl` + `apiKey` (sandbox
keys are bound to their sandbox organisation on the OWS side). Any operation can
select a tenant with `settingsName`:

```json5
options: {
  operation: "() => 'issue'",
  settingsName: "() => 'moe-sandbox'",
  // …
}
```

The `igrant.credential` form control has the matching knob
(`"settingsName": "moe-sandbox"`) so its status polling asks the same tenant.
Without `settingsName` the default record is used.

### Real wallet payment (dynamic credential request)

Charge a fee **inside the wallet** instead of a payment step in the portal: the
issue call carries a payment `presentationDefinitionId` (a stored definition
with `transactionDataDefinitionType: "payment"`) plus the TS12 payment payload.
One QR: the wallet presents the payment credential, the holder approves the
signed amount, and the credential issues in the same session. Two rules:
the **credential definition must be created with
`supportInteractiveAuthorisationEndpoint: true`** (OWS refuses
`presentationDefinitionId` otherwise), and do **not** send `userPin` — the
protocol forbids one on a dynamic request.

```json5
options: {
  operation: "() => 'issue'",
  settingsName: "() => 'moe-sandbox'",
  credentialDefinitionId: "() => '<certificate definition id>'",
  issuanceMode: "() => 'InTime'",
  presentationDefinitionId: "() => '<payment presentation definition id>'",
  transactionData: "(document, event, documents, events) => ({ payload: { transaction_id: 'txn-1', date_time: new Date().toISOString(), payee: { name: 'Ministry of Education', id: 'ESR-MOE-0001' }, execution_date: new Date().toISOString().slice(0, 10), currency: 'EUR', amount: 10 } })",
  claims: "(document, event, documents, events) => ({ /* … */ })",
}
```

To let the citizen **choose the payment instrument** (TS12 defines separate
payment-account and payment-card credentials, each verified by its own
presentation definition), add a `radio.group` field to the task before the
issue event and select the definition from it:

```json5
// In the task's document template:
payment: {
  type: "object",
  description: "Payment method",
  properties: {
    method: {
      type: "string",
      description: "How do you want to pay the fee?",
      control: "radio.group",
      checkRequired: "() => true",
      items: [
        { id: "account", title: "Pay by account" },
        { id: "card", title: "Pay by card" },
      ],
    },
  },
},

// In the issue event, replace the fixed presentationDefinitionId:
presentationDefinitionId: "(document, event, documents, events) => { const doc = (documents || []).find((x) => x.documentTemplateId === <selectTaskDocTemplateId>) || {}; const m = ((doc.data || {}).payment || {}).method; return m === 'card' ? '<card payment presentation definition id>' : '<account payment presentation definition id>'; }",
```

See `examples/workflow-1003-educational-certificate.bpmn` for the full working
shape.

### The learner-journey demo (three linked services)

The `examples/` folder ships a three-step journey that mirrors the iGrant.io
education demonstrator. Each service links to the next, and every Start step
shows the same journey map:

1. `workflow-1004-register-learner.bpmn` — share the **PID** from the wallet
   (verify), enrol with a form prefilled from the disclosed claims, and
   receive a **Learner Profile** credential carrying a generated ULID (issue).
2. `workflow-1003-educational-certificate.bpmn` — share the **Learner
   Profile** (verify): every certificate field comes from its claims, the
   outcome is always "Passed" for now, and the only input is the payment
   method; then one QR pays the fee (TS12 payment presentation) and delivers
   the certificate (dynamic credential request).
3. `workflow-1005-apply-for-a-job.bpmn` — a **cross-organisation** verify:
   the employer tenant (`settingsName: 'civicworks-sandbox'`) asks for the
   PID **and** the certificate in one DCQL query
   (`requestByReference: true`); the disclosed claims of both credentials
   prefill the application form.

When one presentation carries several credentials, the plugin merges the
claims of every `presentation[]` entry into the single `result.claims`
object, so fillers and gateway conditions read them from one place.

### Server-side wait loop (no citizen on the page)

Model *request → delay → checkStatus → gateway* in BPMN:

```json5
// checkStatus event node:
{
  sendToExternalService: {
    providerName: "igrant",
    service: "igrant",
    options: {
      operation: "() => 'checkStatus'",
      exchangeId: "(document, event, documents, events) => events['<issueEventTemplateId>'].data.result.sendToExternalService.sendingResult.response.exchangeId",
      flow: "() => 'issue'",   // or 'verify'
    },
  },
}
// gateway condition on the loop:
(documents, events) => events['<checkEventTemplateId>'].data.result.sendToExternalService.sendingResult.response.done === true
```

## Operations reference

| operation (in `options`) | Required options | Normalized response |
| --- | --- | --- |
| `operation: "issue"` | `credentialDefinitionId` (+ `claims` or `credential`; optional `issuanceMode`, `userPin`, `individualId`, `presentationDefinitionId`, `urlScheme`, `transactionData`, or full `payload`) | `{operation, exchangeId, offerUri, status, credentialStatus, credentialId}` |
| `operation: "verify"` | `presentationDefinitionId` (optional `transactionData`, `individualId`, `mapperId`, `signatureStamp`, `signatureCoordinate`, `requestByReference`, or full `payload`) | `{operation, exchangeId, qrUri, status, dcApiRequest}` |
| `operation: "checkStatus"` | `exchangeId`, `flow: "issue"\|"verify"` | issue: `{status, done, accepted}` · verify: `{status, done, verified, claims, holder}` |
| `operation: "revoke"` | `exchangeId` (optional `revocationStatus: "Revoked"\|"Suspended"\|"Operational"`, default `Revoked`; the credential definition must set `supportRevocation: true`) | `{operation, exchangeId, revocationStatus}` |
| `operation: "supplyClaims"` | `exchangeId` + `claims` (optional `credentialId`) or a full `credential` — completes a `Deferred` issuance | `{operation, exchangeId, success}` |

`isDone` on the send result is `true` for successful `issue`/`verify` creation and
mirrors `done` for `checkStatus` (useful in gateway conditions).

## Logging

Structured, namespaced `igrant|<operation>|<phase>` entries. Claims and API keys are
**never** logged unless `options.debug` is set.

## License

SEE LICENSE IN ../../LICENSE.md
