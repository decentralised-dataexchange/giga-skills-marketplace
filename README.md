# GovBuild Integration Assistant & Skills Marketplace

Prototype implementing the skills-marketplace + AI Integration Assistant model from the
ITU/UNICEF Giga Knowledge Product (Chapters 1-2): wallet solution providers publish
agent-agnostic **skill files** (SKILL.md + OpenAPI specs + credential schemas + rulebooks),
each submission passes an app-store-style review pipeline governed by a dedicated
governance portal, and anyone - a ministry, an integrator, a student - composes published
skills into working single-file HTML apps through an AI assistant running on OpenRouter.

## Architecture and stack

The marketplace catalog is separated from the Integration Assistant by an HTTP API, so it can be deployed and scaled independently:

- **`services/marketplace/`** — standalone Node service owning public catalog reads, skill details, install counts, and the internal skill-context API
- **`web/`** — Next.js 16 Integration Assistant, provider/governance UI, account and chat APIs; its marketplace routes are a browser-facing gateway to the marketplace service
- **PostgreSQL only** via postgres.js. Both deployables accept `DATABASE_URL`; there is no SQLite or in-memory database fallback
- **Vercel AI SDK** (`streamText` + OpenRouter provider) on the server, `useChat` in the browser
- **AI Elements + shadcn/ui + Tailwind** for the UI (conversation, message markdown, web preview)

## Run

The complete split deployment is available through Docker Compose:

```bash
OPENROUTER_API_KEY=... docker compose up --build
```

Open the Integration Assistant at http://localhost:4820. The independently reachable marketplace API is at http://localhost:4830 (`/health`, `/v1/skills`). PostgreSQL 16 data is persisted in the `postgres-data` volume.

For hot-reload development, run only PostgreSQL in Docker (port `5433` avoids a local PostgreSQL conflict), then run both applications on the host:

```bash
docker compose up -d postgres

cd services/marketplace && npm install
DATABASE_URL=postgresql://govbuild:govbuild-dev@localhost:5433/govbuild \
MARKETPLACE_INTERNAL_TOKEN=local-marketplace-token npm run dev

cd ../../web && npm install
DATABASE_URL=postgresql://govbuild:govbuild-dev@localhost:5433/govbuild \
MARKETPLACE_API_URL=http://localhost:4830 \
MARKETPLACE_INTERNAL_TOKEN=local-marketplace-token npm run dev -- -p 4820
```

Set `POSTGRES_PORT` to override the host database port.

If `MARKETPLACE_API_URL` is omitted, the web app retains an in-process catalog adapter for backwards-compatible development. Production should always configure the service URL. The schema bootstraps and demo data seed on the first web API request.
To reset Docker data: `docker compose down -v`.

Checks: `npx tsc --noEmit` and `npx eslint app components lib` both pass clean.

## OpenRouter

The App Builder needs an OpenRouter API key (https://openrouter.ai/keys), managed on
the user's **account** (Settings in the menu bar). The key is stored server-side and
never echoed back in full. A server-wide fallback can be set with `OPENROUTER_API_KEY`.

The chat endpoint (`app/api/assistant/chat`) composes the invoked skill bundles into
the system prompt and streams a Vercel AI SDK run back to `useChat` in the builder.
Models are selectable per account (GPT, Qwen, Gemini, Llama, Mistral, or any custom
OpenRouter model id).

> Prototype note: keys are stored plain in the `users.settings` JSONB column; in
> production they would be encrypted at rest.

## Roles

| Role | Can do |
| --- | --- |
| `builder` | Browse marketplace, invoke skills, build apps with the assistant |
| `provider` | Everything a builder can + register an organisation and submit skill bundles |
| `reviewer` | Governance portal: claim queue items, inspect bundles/check reports, approve / reject / request changes |
| `superadmin` | Everything a reviewer can + verify organisations, manage users and roles, suspend accounts, delist skills |

Governance roles are granted by a super admin on the Governance page - they can never
be self-assigned at registration. Reviewers can only decide reviews they claimed; a
super admin can decide any.

## Demo accounts

| Email | Password | Role |
| --- | --- | --- |
| superadmin@govbuild.test | super123 | Super admin |
| reviewer@govbuild.test | review123 | Skill reviewer |
| provider@igrant.io | provider123 | Approved provider (iGrant.io) |
| trust@govstack.test | provider123 | Approved provider (GovStack Trust Services) |
| labs@educhain.test | provider123 | Provider with a **pending** organisation |
| student@example.com | student123 | Builder (student) |

## The three workflows

1. **Provider onboarding** - a provider registers an organisation (Provider Console);
   a super admin verifies it on the Governance page before any skill can be submitted.
2. **Skill publication (app-store style)** - the provider submits a bundle
   (SKILL.md manifest, `openapi/`, `schemas/`, `rulebooks/`, `examples/`), file by
   file or as a `.zip` (server-side unzip strips a single root folder, filters
   `__MACOSX`/`.DS_Store`/binary files, 2 MB text budget). Automated checks validate
   manifest fields, semver, OpenAPI 3.x parseability, JSON schemas, and `depends_on`
   resolution. Passing bundles enter the review queue where a reviewer claims them
   and approves (published, superseding the previous version), rejects, or requests
   changes. Every step lands in the audit trail.
3. **Build with skills** - in the App Builder, type `/skill-name` to invoke one or
   more published skills (autocomplete, composable, removable chips), describe the
   app, and the assistant streams back a complete single-file HTML app that follows
   the providers' OpenAPI endpoints, schemas, protocol ordering, and rulebooks -
   with a built-in mock mode. Chats persist per account; each generated app gets a
   shareable full-screen URL at `/a/{shareId}` (opens in a new tab); live preview,
   code view, and download live in the preview pane.

## Layout

```
web/
  lib/
    db.ts          postgres.js client, schema bootstrap, seed-on-empty, audit log
    auth.ts        scrypt passwords, bearer tokens, roles
    handler.ts     route() wrapper: auth/roles/body/error shape in one place
    views.ts       snake_case rows -> camelCase API shapes
    checks.ts      automated skill-bundle validation
    chats.ts       shared chat route helpers
    assistant.ts   skill-context composition + model list
    seed.ts        demo users/orgs/skills (bundles live in seed-bundles/)
    client.ts      browser API helper + session store (useSession)
  app/
    api/...        route handlers (same API surface as the previous backends)
    a/[shareId]/   generated apps served full screen
    page.tsx       marketplace          skill/[slug]/  skill detail
    login/         sign in / register   provider/      provider console
    governance/    governance portal    builder/       AI app builder
  components/
    ai-elements/   conversation, message (markdown), web-preview
    ui/            shadcn/ui primitives
    nav.tsx, settings-dialog.tsx, status-badge.tsx, check-list.tsx
  seed-bundles/    the three demo skill bundles as real files
```
