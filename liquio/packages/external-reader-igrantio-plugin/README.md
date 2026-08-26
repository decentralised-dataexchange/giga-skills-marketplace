# @liquio/external-reader-igrantio-plugin

An iGrant.io Organisation Wallet Suite (OWS) **exchange-status reader** plugin for
`components/external-reader`, built on [`@liquio/plugin-sdk`](../plugin-sdk).

It is the polling counterpart of
[`@liquio/event-igrantio-plugin`](../event-igrantio-plugin): while a citizen's wallet
processes a credential offer (OpenID4VCI) or a presentation request (OpenID4VP), the
cabinet's `igrant.credential` form control polls these methods every few seconds
through the platform's existing `POST /documents/:id/external-reader/check` path.
The OWS API key stays server-side.

## Methods

| Method | Input | Output |
| --- | --- | --- |
| `checkCredentialStatus` | `extraParams.exchangeId` (CredentialExchangeId) | `{flow:"issue", exchangeId, status, credentialStatus, done, accepted, holder}` |
| `checkPresentationStatus` | `extraParams.exchangeId` (presentationExchangeId) | `{flow:"verify", exchangeId, status, done, verified, claims, holder, walletUnitAttestationVerified}` |

`done` is `true` when the wallet has completed the exchange
(issuance status ∈ `credential_accepted | credential_acked | token_issued`;
verification: non-empty `vpTokenResponse` or status `presentation_acked`).
For verification, `claims` carries the first disclosed credential's claims and
`verified` the accept/reject decision — gate workflows on `verified === true`.

## Installation

`config/external-reader/plugins.json`:

```json
{
  "pluginsDir": "/var/www/plugins",
  "plugins": [
    {
      "package": "@liquio/external-reader-igrantio-plugin",
      "version": "0.1.0",
      "isEnabled": true,
      "name": "igrant-reader",
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

`config/external-reader/services.json` (maps the service name the frontend uses to
the loaded plugin — `class` must equal the plugin `name` above):

```json
{
  "igrant": { "isEnabled": true, "class": "igrant-reader" }
}
```

## Configuration

The `options` block is identical to the event plugin's — see
[`@liquio/event-igrantio-plugin` README](../event-igrantio-plugin/README.md):
`{ baseUrl, apiKey }` come from the admin-editable settings register (cached 60 s),
with `options.baseUrl` / `options.apiKey` as hard overrides.

> Keep the two plugins' settings pointed at the same register record so the issuing
> side and the polling side always talk to the same OWS organisation.

## License

SEE LICENSE IN ../../LICENSE.md
