from __future__ import annotations

import os
from collections.abc import AsyncIterator
from uuid import UUID, uuid4

import pytest
from psycopg import AsyncConnection, errors, sql
from psycopg.types.json import Jsonb

from marketplace.repository import PostgresCatalogRepository, create_pool

DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
PROVIDER_ID = UUID("d38fec59-2210-4df9-beb5-17fc6515d166")
SECOND_PROVIDER_ID = UUID("0b9f9c37-93e5-4f0f-8b6f-2c8b3f1a6f21")
EMPTY_PROVIDER_ID = UUID("7c0a4a06-9a37-4dfb-9c2b-4a8f4a4a1c11")
SOURCE_A_ID = UUID("aaaa1111-0000-4000-8000-000000000001")
SOURCE_B_ID = UUID("aaaa1111-0000-4000-8000-000000000002")
SOURCE_ARCHIVED_ID = UUID("aaaa1111-0000-4000-8000-000000000003")
SKILL_ID = UUID("531b5b2f-66cb-409f-a1c6-b7a203b062b6")
VERSION_ID = UUID("fe864e24-6d51-435a-9446-5eec92dde747")
SHARED_A_SKILL_ID = UUID("531b5b2f-66cb-409f-a1c6-b7a203b062b7")
SHARED_A_VERSION_ID = UUID("fe864e24-6d51-435a-9446-5eec92dde748")
SHARED_B_SKILL_ID = UUID("531b5b2f-66cb-409f-a1c6-b7a203b062b8")
SHARED_B_VERSION_ID = UUID("fe864e24-6d51-435a-9446-5eec92dde749")
HIDDEN_SKILL_ID = UUID("531b5b2f-66cb-409f-a1c6-b7a203b062b9")
HIDDEN_VERSION_ID = UUID("fe864e24-6d51-435a-9446-5eec92dde750")

pytestmark = [
    pytest.mark.anyio,
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="TEST_DATABASE_URL is not configured"),
]


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def _manifest(description: str) -> Jsonb:
    return Jsonb(
        {
            "description": description,
            "license": "Apache-2.0",
            "targets": {"protocols": ["OpenID4VCI"]},
        }
    )


async def _add_skill(
    connection: AsyncConnection,
    *,
    skill_id: UUID,
    version_id: UUID,
    slug: str,
    org_id: UUID,
    source_id: UUID,
    status: str = "published",
) -> None:
    await connection.execute(
        """
        INSERT INTO skills (
            id, slug, org_id, source_id, status, official,
            published_version_id, created_at
        ) VALUES (%s, %s, %s, %s, %s, false, %s, '2026-08-05T05:30:00Z')
        """,
        (skill_id, slug, org_id, source_id, status, version_id),
    )
    await connection.execute(
        """
        INSERT INTO versions (
            id, skill_id, version, manifest, files, checks,
            status, submitted_at, decided_at
        ) VALUES (%s, %s, '1.0.0', %s, %s, %s,
                  'published', '2026-08-05T05:35:00Z', '2026-08-05T05:39:53.229071Z')
        """,
        (
            version_id,
            skill_id,
            _manifest(f"Skill {slug}"),
            Jsonb([{"path": "SKILL.md", "content": f"# {slug}"}]),
            Jsonb([{"id": "manifest", "status": "pass"}]),
        ),
    )


@pytest.fixture
async def repository() -> AsyncIterator[PostgresCatalogRepository]:
    assert DATABASE_URL is not None
    schema = f"marketplace_test_{uuid4().hex}"
    admin = await AsyncConnection.connect(DATABASE_URL, autocommit=True)
    await admin.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))

    separator = "&" if "?" in DATABASE_URL else "?"
    isolated_url = f"{DATABASE_URL}{separator}options=-c%20search_path%3D{schema}"
    pool = create_pool(isolated_url, 2)
    await pool.open(wait=True)
    try:
        async with pool.connection() as connection:
            # Mirrors the web app's schema (web/lib/db.ts): skill names are
            # unique per organisation, and sources are first-class records.
            await connection.execute(
                """
                CREATE TABLE orgs (
                    id UUID PRIMARY KEY,
                    name TEXT NOT NULL,
                    slug TEXT,
                    logo TEXT,
                    website TEXT,
                    description TEXT,
                    status TEXT NOT NULL,
                    contact TEXT
                );
                CREATE TABLE sources (
                    id UUID PRIMARY KEY,
                    org_id UUID NOT NULL,
                    url TEXT,
                    owner TEXT,
                    repo TEXT,
                    status TEXT NOT NULL DEFAULT 'active',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                CREATE UNIQUE INDEX idx_sources_org_url
                    ON sources(org_id, COALESCE(url, 'direct'));
                CREATE TABLE skills (
                    id UUID PRIMARY KEY,
                    slug TEXT NOT NULL,
                    org_id UUID NOT NULL,
                    source_id UUID,
                    status TEXT NOT NULL,
                    official BOOLEAN NOT NULL,
                    published_version_id UUID,
                    created_at TIMESTAMPTZ NOT NULL
                );
                CREATE UNIQUE INDEX idx_skills_org_slug ON skills(org_id, slug);
                CREATE TABLE versions (
                    id UUID PRIMARY KEY,
                    skill_id UUID NOT NULL,
                    submission_id UUID,
                    version TEXT NOT NULL,
                    manifest JSONB,
                    files JSONB NOT NULL,
                    checks JSONB NOT NULL,
                    status TEXT NOT NULL,
                    submitted_at TIMESTAMPTZ NOT NULL,
                    decided_at TIMESTAMPTZ,
                    repo JSONB
                )
                """
            )
            await connection.execute(
                """
                INSERT INTO orgs (
                    id, name, slug, website, description, status, contact
                ) VALUES (%s, 'iGrant.io', 'igrant-io', 'https://igrant.io',
                          'Wallet provider', 'approved', 'provider@igrant.io')
                """,
                (PROVIDER_ID,),
            )
            await connection.execute(
                """
                INSERT INTO orgs (
                    id, name, slug, website, description, status, contact
                ) VALUES (%s, 'EduChain Labs', 'educhain-labs', NULL,
                          'Analytics tooling', 'approved', 'labs@educhain.test')
                """,
                (SECOND_PROVIDER_ID,),
            )
            # Registered but with nothing published: stays out of public view.
            await connection.execute(
                """
                INSERT INTO orgs (
                    id, name, slug, website, description, status, contact
                ) VALUES (%s, 'Quiet Org', 'quiet-org', NULL,
                          'No published skills yet', 'approved', 'quiet@example.test')
                """,
                (EMPTY_PROVIDER_ID,),
            )
            await connection.execute(
                """
                INSERT INTO sources (id, org_id, url, owner, repo, status) VALUES
                (%s, %s, 'https://github.com/igrant/skills', 'igrant', 'skills', 'active'),
                (%s, %s, 'https://github.com/educhain/skills', 'educhain', 'skills', 'active'),
                (%s, %s, 'https://github.com/educhain/hidden', 'educhain', 'hidden', 'archived')
                """,
                (
                    SOURCE_A_ID,
                    PROVIDER_ID,
                    SOURCE_B_ID,
                    SECOND_PROVIDER_ID,
                    SOURCE_ARCHIVED_ID,
                    SECOND_PROVIDER_ID,
                ),
            )
            await _add_skill(
                connection,
                skill_id=SKILL_ID,
                version_id=VERSION_ID,
                slug="igrantio-issuer",
                org_id=PROVIDER_ID,
                source_id=SOURCE_A_ID,
            )
            # The same skill name published by two organisations: isolated
            # per (org_id, slug), no conflict.
            await _add_skill(
                connection,
                skill_id=SHARED_A_SKILL_ID,
                version_id=SHARED_A_VERSION_ID,
                slug="shared-skill",
                org_id=PROVIDER_ID,
                source_id=SOURCE_A_ID,
            )
            await _add_skill(
                connection,
                skill_id=SHARED_B_SKILL_ID,
                version_id=SHARED_B_VERSION_ID,
                slug="shared-skill",
                org_id=SECOND_PROVIDER_ID,
                source_id=SOURCE_B_ID,
            )
            # A published row under an archived source: the source status
            # alone keeps it out of the catalog (belt and braces - the app
            # also archives the skills when the source is archived).
            await _add_skill(
                connection,
                skill_id=HIDDEN_SKILL_ID,
                version_id=HIDDEN_VERSION_ID,
                slug="hidden-skill",
                org_id=SECOND_PROVIDER_ID,
                source_id=SOURCE_ARCHIVED_ID,
            )

        yield PostgresCatalogRepository(pool)
    finally:
        await pool.close()
        await admin.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
        await admin.close()


async def test_postgres_repository_contract(repository: PostgresCatalogRepository) -> None:
    await repository.health()
    assert await repository.schema_ready() is True

    skills = await repository.list_skills(
        query="issuer",
        provider="igrant-io",
        page=1,
        page_size=12,
    )
    assert skills["total"] == 1
    assert skills["skills"][0]["slug"] == "igrantio-issuer"
    assert skills["skills"][0]["publishedAt"] == "2026-08-05T05:39:53.229Z"
    assert skills["skills"][0]["source"]["repo"] == "skills"
    assert skills["skills"][0]["source"]["status"] == "active"

    by_provider_id = await repository.list_skills(
        query="",
        provider=str(PROVIDER_ID),
        page=1,
        page_size=12,
    )
    assert by_provider_id["total"] == 2

    providers = await repository.list_providers(query="igrant", page=1, page_size=12)
    assert providers["total"] == 1
    assert providers["providers"][0]["skillCount"] == 2

    # An organisation with no published skills is not publicly visible.
    unfiltered = await repository.list_providers(query="", page=1, page_size=12)
    assert unfiltered["total"] == 2
    assert {p["slug"] for p in unfiltered["providers"]} == {"igrant-io", "educhain-labs"}
    assert await repository.get_provider("quiet-org") is None
    assert await repository.get_provider(str(EMPTY_PROVIDER_ID)) is None

    provider_by_slug = await repository.get_provider("igrant-io")
    provider_by_id = await repository.get_provider(str(PROVIDER_ID))
    assert provider_by_slug == provider_by_id
    assert provider_by_slug is not None
    assert provider_by_slug["slug"] == "igrant-io"

    detail = await repository.get_skill("igrantio-issuer")
    assert detail is not None
    assert detail["version"]["version"] == "1.0.0"
    assert detail["source"]["repo"] == "skills"
    assert len(detail["history"]) == 1


async def test_same_slug_under_two_orgs_is_isolated(
    repository: PostgresCatalogRepository,
) -> None:
    # The full catalog carries both rows; a provider filter narrows to one.
    both = await repository.list_skills(query="shared", provider="", page=1, page_size=12)
    assert both["total"] == 2
    assert {entry["org"]["slug"] for entry in both["skills"]} == {"igrant-io", "educhain-labs"}

    only_igrant = await repository.list_skills(
        query="shared", provider="igrant-io", page=1, page_size=12
    )
    assert only_igrant["total"] == 1

    # Unqualified detail answers with the list of homes; qualified detail
    # answers with the owner's record.
    ambiguous = await repository.get_skill("shared-skill")
    assert ambiguous is not None
    assert ambiguous["multiple"] is True
    assert {m["org"]["slug"] for m in ambiguous["matches"]} == {"igrant-io", "educhain-labs"}
    assert all(m["path"].endswith("/shared-skill") for m in ambiguous["matches"])

    a = await repository.get_skill("shared-skill", "igrant-io")
    assert a is not None and a["org"]["slug"] == "igrant-io"
    b = await repository.get_skill("shared-skill", str(SECOND_PROVIDER_ID))
    assert b is not None and b["org"]["slug"] == "educhain-labs"


async def test_archived_source_hides_its_skills(repository: PostgresCatalogRepository) -> None:
    listed = await repository.list_skills(query="hidden", provider="", page=1, page_size=12)
    assert listed["total"] == 0
    assert await repository.get_skill("hidden-skill") is None


async def test_same_org_duplicate_slug_is_rejected(
    repository: PostgresCatalogRepository,
) -> None:
    # Sanity-checks that the fixture DDL matches production: (org_id, slug)
    # is unique, so the same organisation cannot reuse a name.
    async with repository._pool.connection() as connection:  # noqa: SLF001
        with pytest.raises(errors.UniqueViolation):
            await connection.execute(
                """
                INSERT INTO skills (
                    id, slug, org_id, source_id, status, official,
                    published_version_id, created_at
                ) VALUES (%s, 'igrantio-issuer', %s, %s, 'in_submission', false,
                          NULL, now())
                """,
                (uuid4(), PROVIDER_ID, SOURCE_A_ID),
            )
