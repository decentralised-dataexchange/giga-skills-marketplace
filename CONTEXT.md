# ITU Skills Marketplace

The marketplace is a single Next.js application over PostgreSQL: one deployable
serves the public catalog, the provider and governance consoles, and the
education showcase, and reads and writes the database directly. There is no
separate catalog service. This file is the shared vocabulary for that domain.

## Language

**Marketplace**:
The whole product and application: the public catalog, the provider and
governance consoles, and the showcase, served as one Next.js app.
_Avoid_: marketplace service, catalog service, backend

**Catalog**:
The public, read-only view of published skills and providers — the list, search,
and detail pages served without an account.
_Avoid_: registry, directory, store

### Skills and providers

**Skill**:
An agent-agnostic capability published to the marketplace, defined by a SKILL.md
manifest and named by a slug.
_Avoid_: plugin, package, tool

**Slug**:
The lowercase, hyphenated name of a skill, taken from its manifest. It is unique
within one organisation, not across the catalog, so the same slug can name
different skills under two providers.
_Avoid_: id, handle, title

**Organisation**:
The account that owns skills, sources, and member users. It registers without
review and stays hidden until it is approved and publishes a skill.
_Avoid_: org (in prose), team, tenant, account

**Provider**:
An approved organisation that has published at least one skill, and so appears
publicly in the catalog. Every provider is an organisation; not every
organisation is a provider.
_Avoid_: vendor, publisher, seller

**Source**:
Where a skill's code lives: a GitHub repository, addressed in catalog URLs by
its repository name. A skill published without a repository belongs to Bundles.
_Avoid_: repo (as the public term), origin

**Bundles**:
The pseudo-source that holds skills published without a source repository.
_Avoid_: direct, none, misc

**Version**:
One published or superseded revision of a skill. It carries the manifest, the
files, and the checks captured when it was submitted.
_Avoid_: release, revision, tag

**Manifest**:
The parsed front matter of a skill's SKILL.md: its name, description, license,
and metadata. The catalog reads protocols and categories from the metadata.
_Avoid_: frontmatter, config, spec

**Category**:
A grouping of skills within a source, taken from the skill's metadata (a
`category` or `categories` extension), or the top-level repository directory
when the skill declares none. A skill may carry several; the first is its
section home.
_Avoid_: tag, group, folder

**Published**:
The status of a skill that is visible in the catalog. A skill is visible only
when it is published, its organisation is approved, and its source is active.
_Avoid_: live, public, released

### Review

**Submission**:
A provider's request to publish or update a skill. It enters the review pipeline
and becomes a version once it is decided.
_Avoid_: request, proposal, pull request

**Checks**:
The automated conformance results recorded for a skill version, such as that the
manifest parses and declares the required fields.
_Avoid_: tests, validation, lint

**Governance**:
The roles and the console that review submissions and manage organisations. A
super admin is the highest governance role and the only one that can grant
governance roles.
_Avoid_: admin (unqualified), moderation

### Showcase

**Showcase**:
The self-guided National Learner Registry and Education Wallet demo served under
`/showcase`. Its portal sessions are simulated and its demo state lives in the
visitor's browser; the server only brokers the real wallet and consent calls.
_Avoid_: demo app, sandbox, playground
