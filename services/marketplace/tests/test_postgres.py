from __future__ import annotations

import os
from collections.abc import AsyncIterator
from uuid import UUID, uuid4

import pytest
from psycopg import AsyncConnection, sql
from psycopg.types.json import Jsonb

from marketplace.repository import PostgresCatalogRepository, create_pool

DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
PROVIDER_ID = UUID("d38fec59-2210-4df9-beb5-17fc6515d166")
EMPTY_PROVIDER_ID = UUID("0b9f9c37-93e5-4f0f-8b6f-2c8b3f1a6f21")
SKILL_ID = UUID("531b5b2f-66cb-409f-a1c6-b7a203b062b6")
VERSION_ID = UUID("fe864e24-6d51-435a-9446-5eec92dde747")

pytestmark = [
    pytest.mark.anyio,
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="TEST_DATABASE_URL is not configured"),
]


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


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
                CREATE TABLE skills (
                    id UUID PRIMARY KEY,
                    slug TEXT UNIQUE NOT NULL,
                    org_id UUID NOT NULL,
                    status TEXT NOT NULL,
                    official BOOLEAN NOT NULL,
                    published_version_id UUID,
                    created_at TIMESTAMPTZ NOT NULL
                );
                CREATE TABLE versions (
                    id UUID PRIMARY KEY,
                    skill_id UUID NOT NULL,
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
            # Registered but with nothing published: stays out of public view.
            await connection.execute(
                """
                INSERT INTO orgs (
                    id, name, slug, website, description, status, contact
                ) VALUES (%s, 'EduChain Labs', 'educhain-labs', NULL,
                          'No published skills yet', 'approved', 'labs@educhain.test')
                """,
                (EMPTY_PROVIDER_ID,),
            )
            await connection.execute(
                """
                INSERT INTO skills (
                    id, slug, org_id, status, official,
                    published_version_id, created_at
                ) VALUES (%s, 'igrantio-issuer', %s, 'published', true,
                          %s, '2026-08-05T05:30:00Z')
                """,
                (SKILL_ID, PROVIDER_ID, VERSION_ID),
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
                    VERSION_ID,
                    SKILL_ID,
                    Jsonb(
                        {
                            "description": "Issue credentials",
                            "license": "Apache-2.0",
                            "targets": {"protocols": ["OpenID4VCI"]},
                        }
                    ),
                    Jsonb([{"path": "SKILL.md", "content": "# Issuer"}]),
                    Jsonb([{"id": "manifest", "status": "pass"}]),
                ),
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

    by_provider_id = await repository.list_skills(
        query="",
        provider=str(PROVIDER_ID),
        page=1,
        page_size=12,
    )
    assert by_provider_id["total"] == 1

    providers = await repository.list_providers(query="igrant", page=1, page_size=12)
    assert providers["total"] == 1
    assert providers["providers"][0]["skillCount"] == 1

    # An organisation with no published skills is not publicly visible.
    unfiltered = await repository.list_providers(query="", page=1, page_size=12)
    assert unfiltered["total"] == 1
    assert [p["slug"] for p in unfiltered["providers"]] == ["igrant-io"]
    assert await repository.get_provider("educhain-labs") is None
    assert await repository.get_provider(str(EMPTY_PROVIDER_ID)) is None

    provider_by_slug = await repository.get_provider("igrant-io")
    provider_by_id = await repository.get_provider(str(PROVIDER_ID))
    assert provider_by_slug == provider_by_id
    assert provider_by_slug is not None
    assert provider_by_slug["slug"] == "igrant-io"

    detail = await repository.get_skill("igrantio-issuer")
    assert detail is not None
    assert detail["version"]["version"] == "1.0.0"
    assert len(detail["history"]) == 1
