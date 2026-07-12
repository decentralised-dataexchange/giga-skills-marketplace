# Giga Skills Marketplace

A prototype marketplace of provider-published, agent-agnostic **skills** and journey-tagged
**use cases** for the education wallet building block, aligned to the ITU / UNICEF Giga
Knowledge Product (Chapters 1-2). Wallet solution providers publish skill bundles
(`SKILL.md` + OpenAPI specs + credential schemas + rulebooks) and compose them into use
cases; every submission passes an app-store-style automated-checks + human-review pipeline;
and anyone can install a skill or use case into their **own** AI coding agent (Claude Code,
Codex, opencode, Cursor, Pi, ...) to build a working National Learner Registry and
digital-credential solution. No vendor, model, or tool lock-in.

## Architecture and stack

The public catalog is separated from the web app by an HTTP API, so it can be deployed and
scaled independently:

- **`services/marketplace/`** - standalone Node service owning public catalog reads, item
  details, and the internal skill-context API
- **`web/`** - Next.js 16 app: the public marketplace + showcase, and a role-based admin
  dashboard (provider, governance, developer consoles); its marketplace routes are a
  browser-facing gateway to the marketplace service
- **PostgreSQL only** via postgres.js. Both deployables accept `DATABASE_URL`; there is no
  SQLite or in-memory fallback. Postgres runs in Docker (there is no local/host Postgres
  install to manage)
- **shadcn/ui + Tailwind** with Manrope / Open Sans (Giga branding), `streamdown` for
  markdown rendering

## Run

PostgreSQL always runs in Docker. A `Makefile` wraps the common routines - run `make` (or
`make help`) to list them.

### Full stack in Docker

```bash
make up          # docker compose up --build (postgres + marketplace + web)
```

Open the web app at http://localhost:4820. The marketplace API is at http://localhost:4830
(`/health`, `/v1/skills`). PostgreSQL 16 data persists in the `postgres-data` volume.

### Hot-reload development

Run Postgres in Docker, then the two apps on the host:

```bash
make db          # start PostgreSQL in Docker (host port 5433)
make install     # install deps for services/marketplace and web

make marketplace # terminal 1 - marketplace service on :4830
make web         # terminal 2 - web app on :4820
```

The equivalent raw commands:

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

Set `POSTGRES_PORT` to change the host database port. The schema bootstraps and demo data
seed on the first web API request. If `MARKETPLACE_API_URL` is omitted, the web app falls
back to an in-process catalog adapter (development only).

### Make targets

| Target | Does |
| --- | --- |
| `make db` | Start PostgreSQL in Docker (port 5433) |
| `make db-stop` | Stop PostgreSQL |
| `make db-reset` | Wipe and restart PostgreSQL (drops all data) |
| `make install` | Install deps for the marketplace service and the web app |
| `make marketplace` | Run the marketplace service on :4830 |
| `make web` | Run the web app on :4820 |
| `make check` | `tsc --noEmit` + `eslint` on the web app |
| `make up` / `make down` | Build/run or stop the full Docker stack |
| `make reset` | Stop the full stack and wipe the database volume |

## Catalog: skills, use cases, applications

- **Skill** - a provider capability, submitted as a `SKILL.md` bundle (plus `openapi/`,
  `schemas/`, `rulebooks/`, `examples/`), file by file or as a `.zip`.
- **Use case** - a journey-tagged prompt chain authored from a form in the Provider Console.
  Each use case lists prerequisites the app builder must have in place, and one or more
  journeys (J1, J2, ...); each journey has one or more agent prompts, and each prompt
  references its own skills.
- **Application** - a developer showcase (title, description, demo video, and the skills /
  use cases used), submitted from the Developer Console.

Skills and use cases can be endorsed **Official** by the marketplace operator; others show as
**Community**. Each published item exposes an assurance **review trail** (automated checks +
the approval audit).

## Roles

| Role | Can do |
| --- | --- |
| `builder` (Developer) | Browse the marketplace, install skills/use cases into their own agent, submit application showcases |
| `provider` | Everything a developer can + register an organisation and publish skills and use cases for review |
| `reviewer` | Governance: claim the review queue, inspect bundles and check reports, approve / reject / request changes, moderate applications |
| `superadmin` | Everything a reviewer can + verify organisations, manage users and roles, suspend accounts, endorse Official, delist |

Governance roles are granted by a super admin - they can never be self-assigned at
registration. Reviewers can only decide reviews they claimed; a super admin can decide any.

## Demo accounts

| Email | Password | Role |
| --- | --- | --- |
| superadmin@govbuild.test | super123 | Super admin |
| reviewer@govbuild.test | review123 | Skill reviewer |
| provider@igrant.io | provider123 | Approved provider (iGrant.io) |
| trust@govstack.test | provider123 | Approved provider (GovStack Trust Services) |
| labs@educhain.test | provider123 | Provider with a **pending** organisation |
| student@example.com | student123 | Developer (student) |

## Workflows

1. **Provider onboarding** - a provider registers an organisation (Provider Console -
   Organisation); a super admin verifies it (Governance - Organisations) before anything can
   be published.
2. **Publication (app-store style)** - the provider submits a skill bundle or authors a use
   case (Provider Console - Publish). Automated checks validate the manifest, slug, OpenAPI
   3.x parseability, JSON schemas, dependency resolution (skills) or the journey/prompt
   structure (use cases). Passing submissions enter the review queue where a reviewer
   approves (published), rejects, or requests changes. Every step lands in the audit trail.
3. **Build with skills** - anyone browses the marketplace and installs the relevant skill or
   use case into their own AI coding agent; developers can then submit what they built to the
   Showcase.

## Layout

```
Makefile               dev routines (db / install / marketplace / web / up / down)
docker-compose.yml     postgres + marketplace + web services
services/marketplace/  standalone catalog service (server.js)
web/
  lib/
    db.ts          postgres.js client, schema bootstrap, seed-on-empty, audit log
    auth.ts        scrypt passwords, bearer tokens, roles
    handler.ts     route() wrapper: auth/roles/body/error shape in one place
    views.ts       snake_case rows -> camelCase API shapes
    checks.ts      automated skill / use-case validation
    seed.ts        demo users, orgs, skills, use case, applications
    client.ts      browser API helper + session store (useSession)
  app/
    page.tsx           marketplace catalog (skills / use cases)
    skill/[slug]/      skill detail + /review assurance trail
    usecase/[slug]/    use case detail (journeys, prerequisites)
    showcase/          developer application showcase
    login/             standalone dashboard sign-in
    provider/          Organisation / Publish / My submissions
    governance/        Overview / Review queue / Applications / Organisations / Users / Published / Audit
    developer/         Developer Console (submit + manage applications)
    settings/          account profile, avatar, password
    api/...            route handlers
  components/          app shell, sidebar, editors, marketplace UI, shadcn/ui primitives
  seed-bundles/        demo skill bundles + the NLR use case as real files
```
