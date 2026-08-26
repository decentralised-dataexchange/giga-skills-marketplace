# Liquio integration

[Liquio](https://github.com/liquio/liquio) is Kitsoft's open-source, low-code
GovTech platform: business analysts assemble public services as BPMN
processes in an admin panel, and citizens use them in a cabinet portal. This
folder integrates the iGrant.io Organisation Wallet Suite (OWS) into Liquio,
so that any Liquio service can issue and verify EUDI wallet credentials, and
delivers the same learner journey as the education showcase under
`/showcase` as three cabinet services:

1. **Register as a learner**: share the PID from the wallet, enrol with a
   form prefilled from the disclosed claims, and receive a Learner Profile
   credential carrying a unique learner identifier (ULID).
2. **Educational certificate**: share the Learner Profile, choose to pay by
   account or by card, and one scan both approves the 10.00 EUR fee (TS12
   transaction data) and delivers the certificate credential.
3. **Apply for a job**: a cross-organisation verification; one scan shares
   the PID and the certificate with the employer organisation, and the
   application form fills itself.

## Contents

| Path | Purpose |
| ---- | ------- |
| `liquio-igrant.patch` | All source changes against Liquio `main`: the two backend plugins, the `igrant.credential` cabinet form control, configuration templates and the example workflows |
| `plugins/` | Prebuilt npm tarballs of the two plugins, ready for the platform's plugin installer |
| `workflows/` | The three journey workflows and the settings register, in Liquio's import format |

The backend integration is a pair of standard Liquio plugins built on
`@liquio/plugin-sdk`: an external-service provider for the `event` service
(issue, verify, check status, revoke, supply deferred claims) and an
exchange-status reader for the `external-reader` service. The OWS base URL
and API keys are configured through the Liquio admin panel in a settings
register, one record per organisation. The cabinet form control renders the
wallet QR code, polls the exchange and advances the task when the wallet
completes; it is the only part that requires rebuilding a Liquio image,
because the platform has no runtime plugin mechanism for frontend controls.

## Run locally

Prerequisites: Docker with Compose, Git.

1. Clone Liquio and apply the patch:

   ```bash
   git clone https://github.com/liquio/liquio.git
   cd liquio
   git am /path/to/giga-skills-marketplace/liquio/liquio-igrant.patch
   ```

2. Generate the configuration and certificates, then place the plugin
   tarballs where the containers mount the configuration:

   ```bash
   ./scripts/init.sh
   mkdir -p config/event/plugins-local config/external-reader/plugins-local
   cp /path/to/liquio/plugins/liquio-event-igrantio-plugin-0.1.0.tgz config/event/plugins-local/
   cp /path/to/liquio/plugins/liquio-external-reader-igrantio-plugin-0.1.0.tgz config/external-reader/plugins-local/
   ```

3. Enable the plugins. In `config/event/plugins.json` and
   `config/external-reader/plugins.json`, set `"isEnabled": true`, set
   `"version"` to the tarball spec
   (`"file:/var/www/config/plugins-local/liquio-event-igrantio-plugin-0.1.0.tgz"`
   and the external-reader equivalent), and set
   `"options.settingsRegister.token"` to the value of `registers.token` in
   `config/event/requester.json`. In the same `requester.json`, register the
   provider:

   ```json
   "externalService": {
     "igrant": { "providerType": "plugin", "pluginName": "igrant" }
   }
   ```

   In `config/external-reader/services.json`, set the `igrant` entry to
   `"isEnabled": true`.

4. Start the platform. The first run builds every image from source,
   including the cabinet with the wallet control, and takes a while:

   ```bash
   docker compose up -d
   ```

   On Apple silicon, the `persist-link` image needs
   `platform: linux/amd64` in a `docker-compose.override.yml`, because its
   PhantomJS dependency has no arm64 build.

5. Sign in. The admin panel is at http://localhost:8082 (key file
   `config/admin.p12`, password `admin`) and the cabinet at
   http://localhost:8081 (key file `config/demo.p12`, password `demo`).

Success shows `plugin-load-success` in the `event` and `external-reader`
logs.

## Configure iGrant.io

You need an OWS API key (demo environment: https://demo-api.igrant.io). For the
two-organisation story, use two sandbox organisations: a ministry that
issues and a separate employer that verifies. Create these definitions
through the OWS API or dashboard, all with the x509 trust anchor:

| Organisation | Definition | Notes |
| ------------ | ---------- | ----- |
| Issuer | Credential definition `LearnerProfile` | Claims: ulid, given_name, family_name, birthdate, id_number, phone, email, institution, programme_name; revocation on; set a display name |
| Issuer | Credential definition `EducationalInstitutionCertificate` | The claims above plus programme_level, final_outcome, issue_date; revocation on; `supportInteractiveAuthorisationEndpoint: true` is mandatory for the payment flow |
| Issuer | Presentation definition for the PID | vct `urn:eu.europa.ec.eudi:pid:1`; claims given_name, family_name, birthdate, email |
| Issuer | Presentation definition for the Learner Profile | vct `LearnerProfile`; the nine claims above |
| Issuer | Two payment presentation definitions | `transactionDataDefinitionType: "payment"`; one for the TS12 payment account credential, one for the payment card credential |
| Verifier | Presentation definition for the job application | One DCQL query with two credentials: the PID (given_name, family_name, email) and the certificate (institution, programme_name, programme_level, final_outcome, issue_date, ulid); `clientIdScheme: x509_hash` |

The issuer certificate must be granted on the trust list the wallet
consults; otherwise the wallet downloads the credential, fails the trust
check and silently discards it while the server still reports success.
Verify with the public lookup: `POST
https://trustlist.nxd.foundation/trust-list/lookup` with
`{"x5c": ["<base64 DER leaf>"]}` must answer `"status": "granted"`.

## Configure Liquio

1. In the admin panel, open Registers, import
   `workflows/register-200-200.dat`, and add one record per organisation:

   ```json
   { "name": "moe-sandbox", "baseUrl": "https://demo-api.igrant.io", "apiKey": "<issuer key>" }
   { "name": "civicworks-sandbox", "baseUrl": "https://demo-api.igrant.io", "apiKey": "<verifier key>" }
   ```

   Records take effect within a minute; no restart is needed.

2. Open Workflows and import the three files from `workflows/`.

3. Replace the placeholders in the imported templates (the event nodes and
   the `igrant.credential` controls) with your values:

   | Placeholder | Value |
   | ----------- | ----- |
   | `REPLACE_WITH_SETTINGS_NAME` | Issuer record name, for example `moe-sandbox` |
   | `REPLACE_WITH_EMPLOYER_SETTINGS_NAME` | Verifier record name, for example `civicworks-sandbox` |
   | `REPLACE_WITH_PID_PRESENTATION_DEFINITION_ID` | PID presentation definition id |
   | `REPLACE_WITH_LEARNER_PROFILE_DEFINITION_ID` | Learner Profile credential definition id |
   | `REPLACE_WITH_LEARNER_PROFILE_PRESENTATION_DEFINITION_ID` | Learner Profile presentation definition id |
   | `REPLACE_WITH_EDU_CERT_DEFINITION_ID` | Certificate credential definition id |
   | `REPLACE_WITH_ACCOUNT_PAYMENT_PRESENTATION_DEFINITION_ID` | Payment account presentation definition id |
   | `REPLACE_WITH_CARD_PAYMENT_PRESENTATION_DEFINITION_ID` | Payment card presentation definition id |
   | `REPLACE_WITH_JOB_APPLICATION_PRESENTATION_DEFINITION_ID` | Job application presentation definition id |

The three services then appear as top-level entries in the cabinet's
service catalogue.

## Walk the journey

On a phone with the iGrant.io Data Wallet, load a PID credential and a TS12
payment credential (account or card), then run the three services in order
from the cabinet. Each service links to the next, and every start page shows
the journey map and its prerequisites. To demonstrate revocation, revoke the
certificate through the plugin's `revoke` operation or the OWS API and apply
for the job again: the verification fails and the service ends on the
"Application failed" branch.

## Notes

The workflows are ordinary Liquio content: everything in them can be built
or edited in the admin panel's workflow designer without programming. The
plugin package's README inside the patch
(`packages/event-igrantio-plugin/README.md`) documents every operation and
the copy-paste snippets for analysts.
