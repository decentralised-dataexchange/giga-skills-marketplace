from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from marketplace.main import PUBLIC_CACHE, create_app

pytestmark = pytest.mark.anyio


class FakeRepository:
    def __init__(self) -> None:
        self.skill_result: dict[str, Any] | None = {
            "skill": {"slug": "issuer"},
            "org": {"name": "iGrant.io"},
            "version": {"version": "1.0.0"},
            "history": [],
        }
        self.provider_result: dict[str, Any] | None = {
            "id": "e2e4ac6d-5f1d-497e-9427-b8f1b76e731f",
            "name": "iGrant.io",
            "slug": "igrant-io",
            "logo": None,
            "website": "https://igrant.io",
            "description": "Provider",
            "skillCount": 1,
            "usecaseCount": 0,
        }
        self.skill_list_args: dict[str, Any] = {}
        self.provider_list_args: dict[str, Any] = {}
        self.health_calls = 0
        self.health_error: Exception | None = None
        self.schema_ready_result = True

    async def health(self) -> None:
        self.health_calls += 1
        if self.health_error is not None:
            raise self.health_error

    async def schema_ready(self) -> bool:
        return self.schema_ready_result

    async def list_skills(self, **kwargs: Any) -> dict[str, Any]:
        self.skill_list_args = kwargs
        return {
            "skills": [],
            "total": 0,
            "page": kwargs["page"],
            "pageSize": kwargs["page_size"],
        }

    async def list_providers(self, **kwargs: Any) -> dict[str, Any]:
        self.provider_list_args = kwargs
        return {
            "providers": [],
            "total": 0,
            "page": kwargs["page"],
            "pageSize": kwargs["page_size"],
        }

    async def get_provider(self, _key: str) -> dict[str, Any] | None:
        return self.provider_result

    async def get_skill(self, _slug: str) -> dict[str, Any] | None:
        return self.skill_result


@pytest.fixture
def repository() -> FakeRepository:
    return FakeRepository()


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
async def client(repository: FakeRepository) -> AsyncIterator[AsyncClient]:
    application = create_app(repository)
    async with application.router.lifespan_context(application):
        async with AsyncClient(
            transport=ASGITransport(app=application), base_url="http://testserver"
        ) as test_client:
            yield test_client


async def test_health_checks_postgres(client: AsyncClient, repository: FakeRepository) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "postgresql"}
    assert repository.health_calls == 1


async def test_ready_requires_schema(client: AsyncClient, repository: FakeRepository) -> None:
    ready = await client.get("/ready")
    assert ready.status_code == 200
    assert ready.json() == {"status": "ready", "database": "postgresql"}

    # A pristine database (schema bootstrapped later by the web app) is
    # healthy but not ready, so Kubernetes routes no traffic to it yet.
    repository.schema_ready_result = False
    pending = await client.get("/ready")
    assert pending.status_code == 503
    assert pending.json() == {"error": "Catalog schema not ready yet"}


async def test_skill_list_normalizes_filters_and_pagination(
    client: AsyncClient, repository: FakeRepository
) -> None:
    response = await client.get(
        "/v1/skills",
        params={
            "q": "  WALLET  ",
            "provider": "igrant-io",
            "page": "0",
            "pageSize": "999",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"skills": [], "total": 0, "page": 1, "pageSize": 200}
    assert repository.skill_list_args == {
        "query": "wallet",
        "provider": "igrant-io",
        "page": 1,
        "page_size": 200,
    }
    assert response.headers["cache-control"] == PUBLIC_CACHE


async def test_provider_list_uses_defaults_for_invalid_pagination(
    client: AsyncClient, repository: FakeRepository
) -> None:
    response = await client.get("/v1/providers?q=++GIGA++&page=nope&pageSize=none")

    assert response.status_code == 200
    assert response.json() == {"providers": [], "total": 0, "page": 1, "pageSize": 12}
    assert repository.provider_list_args == {
        "query": "giga",
        "page": 1,
        "page_size": 12,
    }
    assert response.headers["cache-control"] == PUBLIC_CACHE


async def test_detail_endpoints_preserve_contract(client: AsyncClient) -> None:
    provider = await client.get("/v1/providers/igrant-io")
    skill = await client.get("/v1/skills/issuer")

    assert provider.status_code == 200
    assert provider.json()["slug"] == "igrant-io"
    assert provider.headers["cache-control"] == PUBLIC_CACHE
    assert skill.status_code == 200
    assert skill.json()["version"]["version"] == "1.0.0"
    assert skill.headers["cache-control"] == PUBLIC_CACHE


async def test_missing_resources_preserve_error_bodies(
    client: AsyncClient, repository: FakeRepository
) -> None:
    repository.provider_result = None
    repository.skill_result = None

    provider = await client.get("/v1/providers/missing")
    skill = await client.get("/v1/skills/missing")

    assert provider.json() == {"error": "Provider not found"}
    assert skill.json() == {"error": "Skill not found or not published"}


async def test_common_http_headers_and_fallbacks(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("CORS_ORIGIN", "https://example.org")

    health = await client.get("/health")
    options = await client.options("/anything")
    missing = await client.get("/missing")

    assert health.headers["access-control-allow-origin"] == "https://example.org"
    assert health.headers["x-content-type-options"] == "nosniff"
    assert options.status_code == 204
    assert options.content == b""
    assert missing.status_code == 404
    assert missing.json() == {"error": "Not found"}


async def test_internal_errors_retain_common_headers(repository: FakeRepository) -> None:
    repository.health_error = RuntimeError("database unavailable")
    application = create_app(repository)
    async with application.router.lifespan_context(application):
        async with AsyncClient(
            transport=ASGITransport(app=application, raise_app_exceptions=False),
            base_url="http://testserver",
        ) as client:
            response = await client.get("/health")

    assert response.status_code == 500
    assert response.json() == {"error": "Internal server error"}
    assert response.headers["access-control-allow-origin"] == "*"
    assert response.headers["x-content-type-options"] == "nosniff"
