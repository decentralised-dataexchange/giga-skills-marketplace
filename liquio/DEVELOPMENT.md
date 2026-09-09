# Developing the Liquio integration

How to work on the plugins, the cabinet control and the journey workflows
against the Liquio source on GitHub. Prerequisites: Node.js 18 or later
(22 is what we test with), Docker with Compose, Git.

## Where development happens

The canonical working tree is a clone (or fork) of
[liquio/liquio](https://github.com/liquio/liquio) with the patch applied:

```bash
git clone https://github.com/liquio/liquio.git
cd liquio
git am /path/to/this-repository/liquio/liquio-igrant.patch
```

The patch is a series of ordinary commits, so the result is a normal branch
you can rebase, extend and turn into pull requests against the upstream
repository (see Liquio's `CONTRIBUTING.md` for their fork and pull-request
process). After the patch, the integration lives in:

| Path in the Liquio tree | Contains |
| ----------------------- | -------- |
| `packages/event-igrantio-plugin/` | The external-service plugin (issue, verify, check status, revoke, supply deferred claims) |
| `packages/external-reader-igrantio-plugin/` | The exchange-status reader the cabinet polls |
| `packages/front-core/components/JsonSchema/elements/IgrantCredential/` | The `igrant.credential` wallet control |
| `components/cabinet-front/src/application/components/JsonSchema/elements/index.jsx` | Registers the control in the cabinet |
| `config-templates/event/`, `config-templates/external-reader/` | Plugin configuration templates |
| `examples/` | The journey workflows, the settings register and `INTEGRATION.md` |

The `packages/` copy in this folder is the same source, included so the
plugins can be read and built without cloning Liquio. Treat the patch as
the source of truth; regenerate both the copy and the tarballs from the
Liquio branch when the code changes.

## Backend plugins

Each plugin is a standard npm package on `@liquio/plugin-sdk`, declared to
the platform by the `liquioPlugin` manifest in its `package.json` (kind
`event-external-service` or `external-reader-provider`). The development
loop, in either package directory:

```bash
npm install
npm run build   # TypeScript to dist/
npx jest        # unit tests with mocked HTTP
npm pack        # produces the installable tarball
```

To try a change against a running Compose stack, replace the tarball and
reinstall:

```bash
cp liquio-event-igrantio-plugin-0.1.0.tgz ../../config/event/plugins-local/
docker compose up -d --force-recreate event-plugin-installer
docker compose restart event
docker compose logs event | grep plugin-load
```

The same routine applies to the reader plugin with
`config/external-reader/plugins-local/`, `external-reader-plugin-installer`
and the `external-reader` service. A successful start logs
`plugin-load-success` and `plugin-load-summary`.

Contracts worth knowing before you change the code:

- The event service evaluates every value under
  `sendToExternalService.options` as a function string and hands the result
  to the provider. The provider dispatches on `options.operation`; the
  dotted `providerName: "igrant.issue"` form does not work for plugins.
- The reader plugin must wrap every method result in a `{ data: ... }`
  envelope, because the task service extracts the `data` property.
- When one presentation carries several credentials, both plugins merge the
  claims of every `presentation[]` entry into a single object
  (`mergePresentationClaims`); form fillers and gateway conditions rely on
  this.
- `SettingsResolver` reads `{ baseUrl, apiKey }` from the settings register
  over HTTP and caches for sixty seconds; `settingsName` on an operation
  selects the record, which is how one plugin instance serves several
  organisations.

## Cabinet control

The `igrant.credential` control lives in
`packages/front-core/components/JsonSchema/elements/IgrantCredential/index.jsx`
and is registered in the cabinet's element index. Frontend code is compiled
into the image, so after an edit rebuild the cabinet:

```bash
docker compose build cabinet-front
docker compose up -d cabinet-front
```

Then hard refresh the browser. The build prints `Compiled successfully`
when the bundle is clean. There is no runtime plugin mechanism for
frontend controls, which is why this part is a patch rather than a package.

## Workflows

The three services are ordinary Liquio content. Edit them in the admin
panel's workflow designer (http://localhost:8082/workflow), and export
them from the workflow list to refresh the `.bpmn` files kept in
`examples/` and in this folder's `workflows/`. The analyst-facing
snippets for every operation are documented in
`packages/event-igrantio-plugin/README.md`.

## Quality gates

Both packages ship jest suites (mocked OWS responses, no network). Run
them before regenerating the tarballs:

```bash
cd packages/event-igrantio-plugin && npx jest
cd packages/external-reader-igrantio-plugin && npx jest
```

For an end-to-end check, follow `README.md` in this folder: run the stack,
configure the definitions and walk the journey with a real wallet.
