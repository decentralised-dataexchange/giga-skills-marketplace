from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any, Protocol
from uuid import UUID

from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


class CatalogRepository(Protocol):
    async def health(self) -> None: ...

    async def schema_ready(self) -> bool: ...

    async def list_skills(
        self,
        *,
        query: str,
        provider: str,
        page: int,
        page_size: int,
    ) -> dict[str, Any]: ...

    async def list_providers(self, *, query: str, page: int, page_size: int) -> dict[str, Any]: ...

    async def get_provider(self, key: str) -> dict[str, Any] | None: ...

    async def get_skill(self, slug: str) -> dict[str, Any] | None: ...


def create_pool(database_url: str, max_connections: int) -> AsyncConnectionPool:
    return AsyncConnectionPool(
        conninfo=database_url,
        min_size=0,
        max_size=max_connections,
        open=False,
        kwargs={"row_factory": dict_row},
        check=AsyncConnectionPool.check_connection,
    )


def _published_at(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    return value


def _entry(row: dict[str, Any]) -> dict[str, Any]:
    manifest = row.get("manifest") or {}
    if not isinstance(manifest, dict):
        manifest = {}
    targets = manifest.get("targets") or {}
    if not isinstance(targets, dict):
        targets = {}
    metadata = manifest.get("metadata") or {}
    if not isinstance(metadata, dict):
        metadata = {}
    configured_protocols = targets.get("protocols")
    metadata_protocols = metadata.get("protocols")
    if isinstance(configured_protocols, list):
        protocols = configured_protocols
    elif isinstance(metadata_protocols, str):
        protocols = [value for value in re.split(r"\s*,\s*", metadata_protocols) if value]
    else:
        protocols = []

    repo = row.get("repo")
    if not isinstance(repo, dict):
        repo = None
    return {
        "id": row["id"],
        "slug": row["slug"],
        "status": row["status"],
        "repo": (
            {
                "url": repo.get("url"),
                "owner": repo.get("owner"),
                "repo": repo.get("repo"),
                "dir": repo.get("dir") or "",
                "stars": repo.get("stars") or 0,
            }
            if repo
            else None
        ),
        "org": {
            "id": row["org_id"],
            "slug": row.get("org_slug"),
            "name": row["org_name"],
            "website": row.get("org_website"),
        },
        "version": row["version"],
        "publishedAt": _published_at(row.get("decided_at")),
        "description": manifest.get("description") or "",
        "license": manifest.get("license") or "",
        "protocols": protocols,
    }


def _provider_entry(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "slug": row.get("slug"),
        "logo": row.get("logo"),
        "website": row.get("website"),
        "description": row.get("description") or "",
        "skillCount": int(row["skill_count"]),
    }


class PostgresCatalogRepository:
    def __init__(self, pool: AsyncConnectionPool) -> None:
        self._pool = pool

    async def health(self) -> None:
        async with self._pool.connection() as connection:
            await connection.execute("SELECT 1")

    async def schema_ready(self) -> bool:
        # The web app owns schema bootstrap; readiness means the catalog
        # tables exist here too.
        async with self._pool.connection() as connection:
            row = await (
                await connection.execute("SELECT to_regclass('skills') AS skills_table")
            ).fetchone()
        return bool(row and row["skills_table"])

    async def list_skills(
        self,
        *,
        query: str,
        provider: str,
        page: int,
        page_size: int,
    ) -> dict[str, Any]:
        # A suspended or rejected organisation takes its skills off the catalog.
        conditions = ["s.status = 'published'", "o.status = 'approved'"]
        params: list[Any] = []
        if provider:
            if UUID_RE.fullmatch(provider):
                conditions.append("s.org_id = %s")
                params.append(UUID(provider))
            else:
                conditions.append("o.slug = %s")
                params.append(provider)
        if query:
            conditions.append(
                "(lower(s.slug) LIKE %s OR lower(o.name) LIKE %s "
                "OR lower(coalesce(v.manifest->>'description','')) LIKE %s)"
            )
            like = f"%{query}%"
            params.extend((like, like, like))

        where = " AND ".join(conditions)
        offset = (page - 1) * page_size
        list_sql = f"""
            SELECT s.id, s.slug, s.status, v.repo,
                   o.id AS org_id, o.slug AS org_slug, o.name AS org_name,
                   o.website AS org_website, v.version, v.manifest, v.decided_at
            FROM skills s
            JOIN orgs o ON o.id = s.org_id
            JOIN versions v ON v.id = s.published_version_id
            WHERE {where}
            ORDER BY v.decided_at DESC NULLS LAST, s.created_at DESC
            LIMIT %s OFFSET %s
        """
        count_sql = f"""
            SELECT count(*)::int AS n
            FROM skills s
            JOIN orgs o ON o.id = s.org_id
            JOIN versions v ON v.id = s.published_version_id
            WHERE {where}
        """

        async with self._pool.connection() as connection:
            rows = await (
                await connection.execute(list_sql, (*params, page_size, offset))
            ).fetchall()
            count = await (await connection.execute(count_sql, params)).fetchone()
        return {
            "skills": [_entry(row) for row in rows],
            "total": count["n"] if count else 0,
            "page": page,
            "pageSize": page_size,
        }

    async def list_providers(self, *, query: str, page: int, page_size: int) -> dict[str, Any]:
        # Organisations register without review, so only those with at least
        # one published skill are publicly visible.
        where = (
            "o.status = 'approved' AND EXISTS ("
            "SELECT 1 FROM skills p WHERE p.org_id = o.id AND p.status = 'published')"
        )
        params: list[Any] = []
        if query:
            where += " AND lower(o.name) LIKE %s"
            params.append(f"%{query}%")
        offset = (page - 1) * page_size
        list_sql = f"""
            SELECT o.id, o.name, o.slug, o.logo, o.website, o.description,
                   count(s.id) FILTER (WHERE s.status = 'published') AS skill_count
            FROM orgs o
            LEFT JOIN skills s ON s.org_id = o.id
            WHERE {where}
            GROUP BY o.id
            ORDER BY skill_count DESC, o.name ASC
            LIMIT %s OFFSET %s
        """
        count_sql = f"SELECT count(*)::int AS n FROM orgs o WHERE {where}"
        async with self._pool.connection() as connection:
            rows = await (
                await connection.execute(list_sql, (*params, page_size, offset))
            ).fetchall()
            count = await (await connection.execute(count_sql, params)).fetchone()
        return {
            "providers": [_provider_entry(row) for row in rows],
            "total": count["n"] if count else 0,
            "page": page,
            "pageSize": page_size,
        }

    async def get_provider(self, key: str) -> dict[str, Any] | None:
        if UUID_RE.fullmatch(key):
            match = "o.id = %s"
            value: Any = UUID(key)
        else:
            match = "o.slug = %s"
            value = key
        query = f"""
            SELECT o.id, o.name, o.slug, o.logo, o.website, o.description,
                   count(s.id) FILTER (WHERE s.status = 'published') AS skill_count
            FROM orgs o
            LEFT JOIN skills s ON s.org_id = o.id
            WHERE {match} AND o.status = 'approved'
              AND EXISTS (SELECT 1 FROM skills p
                          WHERE p.org_id = o.id AND p.status = 'published')
            GROUP BY o.id
        """
        async with self._pool.connection() as connection:
            row = await (await connection.execute(query, (value,))).fetchone()
        return _provider_entry(row) if row else None

    async def get_skill(self, slug: str) -> dict[str, Any] | None:
        async with self._pool.connection() as connection:
            skill = await (
                await connection.execute(
                    """
                    SELECT s.*, o.name AS org_name, o.slug AS org_slug, o.logo AS org_logo,
                           o.website AS org_website, o.description AS org_description,
                           o.status AS org_status, o.contact AS org_contact
                    FROM skills s
                    JOIN orgs o ON o.id = s.org_id
                    WHERE s.slug = %s AND s.status = 'published'
                      AND o.status = 'approved'
                    """,
                    (slug,),
                )
            ).fetchone()
            if not skill:
                return None
            version = await (
                await connection.execute(
                    "SELECT * FROM versions WHERE id = %s", (skill["published_version_id"],)
                )
            ).fetchone()
            if not version:
                raise RuntimeError(f"Published skill {slug!r} has no published version")
            history = await (
                await connection.execute(
                    """
                    SELECT id, version, status, decided_at
                    FROM versions
                    WHERE skill_id = %s AND status IN ('published', 'superseded')
                    ORDER BY submitted_at DESC
                    """,
                    (skill["id"],),
                )
            ).fetchall()

        return {
            "skill": {
                "id": skill["id"],
                "slug": skill["slug"],
            },
            "org": {
                "name": skill["org_name"],
                "slug": skill.get("org_slug"),
                "logo": skill.get("org_logo"),
                "website": skill.get("org_website"),
                "description": skill.get("org_description"),
                "status": skill["org_status"],
                "contact": skill.get("org_contact"),
            },
            "version": {
                "id": version["id"],
                "version": version["version"],
                "manifest": version.get("manifest"),
                "files": version["files"],
                "checks": version["checks"],
                "repo": version.get("repo"),
                "publishedAt": _published_at(version.get("decided_at")),
            },
            "history": [
                {
                    "id": item["id"],
                    "version": item["version"],
                    "status": item["status"],
                    "publishedAt": _published_at(item.get("decided_at")),
                }
                for item in history
            ],
        }
