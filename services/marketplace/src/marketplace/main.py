from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Query, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from marketplace.config import Settings
from marketplace.repository import CatalogRepository, PostgresCatalogRepository, create_pool

PUBLIC_CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=86400"
logger = logging.getLogger(__name__)


def _pagination(page: str | None, page_size: str | None) -> tuple[int, int]:
    def parse(value: str | None, default: int) -> int:
        try:
            return int(value or "")
        except ValueError:
            return default

    # 200 matches the per-submission skill cap, so one page can carry a full source.
    return max(1, parse(page, 1)), min(200, max(1, parse(page_size, 12)))


def _error(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": message},
        headers={
            "Access-Control-Allow-Origin": os.environ.get("CORS_ORIGIN", "*"),
            "X-Content-Type-Options": "nosniff",
        },
    )


def get_repository(request: Request) -> CatalogRepository:
    return request.app.state.repository


RepositoryDependency = Annotated[CatalogRepository, Depends(get_repository)]


def create_app(repository: CatalogRepository | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        if repository is not None:
            application.state.repository = repository
            yield
            return

        settings = Settings.from_env()
        pool = create_pool(settings.database_url, settings.db_max_connections)
        await pool.open(wait=True)
        application.state.repository = PostgresCatalogRepository(pool)
        try:
            yield
        finally:
            await pool.close()

    application = FastAPI(
        title="Giga Skills Marketplace API",
        version="1.0.0",
        lifespan=lifespan,
    )

    @application.middleware("http")
    async def response_headers(request: Request, call_next: Any) -> Response:
        cors_origin = os.environ.get("CORS_ORIGIN", "*")
        if request.method == "OPTIONS":
            return Response(
                status_code=204,
                headers={
                    "Access-Control-Allow-Origin": cors_origin,
                    "X-Content-Type-Options": "nosniff",
                },
            )
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = cors_origin
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @application.exception_handler(StarletteHTTPException)
    async def http_error(_request: Request, exception: StarletteHTTPException) -> JSONResponse:
        if exception.status_code in {404, 405}:
            return _error(404, "Not found")
        return _error(exception.status_code, str(exception.detail))

    @application.exception_handler(RequestValidationError)
    async def validation_error(
        _request: Request, _exception: RequestValidationError
    ) -> JSONResponse:
        return _error(404, "Not found")

    @application.exception_handler(Exception)
    async def internal_error(_request: Request, exception: Exception) -> JSONResponse:
        logger.exception("Unhandled marketplace API error", exc_info=exception)
        return _error(500, "Internal server error")

    @application.get("/health")
    async def health(repo: RepositoryDependency) -> dict[str, str]:
        await repo.health()
        return {"status": "ok", "database": "postgresql"}

    @application.get("/ready", response_model=None)
    async def ready(repo: RepositoryDependency) -> JSONResponse | dict[str, str]:
        # Readiness requires the catalog schema, which the web app bootstraps;
        # /health stays a pure liveness check so a fresh deploy does not
        # crash-loop while it waits.
        await repo.health()
        if not await repo.schema_ready():
            return _error(503, "Catalog schema not ready yet")
        return {"status": "ready", "database": "postgresql"}

    @application.get("/v1/skills")
    async def list_skills(
        response: Response,
        repo: RepositoryDependency,
        q: str = "",
        provider: str = "",
        page: str | None = None,
        page_size: Annotated[str | None, Query(alias="pageSize")] = None,
    ) -> dict[str, Any]:
        page_number, size = _pagination(page, page_size)
        result = await repo.list_skills(
            query=q.lower().strip(),
            provider=provider,
            page=page_number,
            page_size=size,
        )
        response.headers["Cache-Control"] = PUBLIC_CACHE
        return result

    @application.get("/v1/providers")
    async def list_providers(
        response: Response,
        repo: RepositoryDependency,
        q: str = "",
        page: str | None = None,
        page_size: Annotated[str | None, Query(alias="pageSize")] = None,
    ) -> dict[str, Any]:
        page_number, size = _pagination(page, page_size)
        result = await repo.list_providers(
            query=q.lower().strip(), page=page_number, page_size=size
        )
        response.headers["Cache-Control"] = PUBLIC_CACHE
        return result

    @application.get("/v1/providers/{key}")
    async def get_provider(key: str, repo: RepositoryDependency) -> Response:
        result = await repo.get_provider(key)
        if result is None:
            return _error(404, "Provider not found")
        return JSONResponse(
            content=jsonable_encoder(result), headers={"Cache-Control": PUBLIC_CACHE}
        )

    @application.get("/v1/skills/{slug}")
    async def get_skill(slug: str, repo: RepositoryDependency, provider: str = "") -> Response:
        # Skill names are unique per organisation; ?provider= picks the owner
        # when several publish the same name (otherwise the answer lists the
        # matches under "multiple").
        result = await repo.get_skill(slug, provider)
        if result is None:
            return _error(404, "Skill not found or not published")
        return JSONResponse(
            content=jsonable_encoder(result), headers={"Cache-Control": PUBLIC_CACHE}
        )

    return application


app = create_app()
