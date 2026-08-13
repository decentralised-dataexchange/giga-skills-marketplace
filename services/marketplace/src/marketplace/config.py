from __future__ import annotations

import os
from dataclasses import dataclass


def _positive_int(value: str | None, default: int) -> int:
    try:
        parsed = int(value or "")
    except ValueError:
        return default
    return parsed if parsed > 0 else default


@dataclass(frozen=True, slots=True)
class Settings:
    database_url: str
    db_max_connections: int = 10
    port: int = 4830

    @classmethod
    def from_env(cls) -> Settings:
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            raise RuntimeError("DATABASE_URL is required; the marketplace supports PostgreSQL only")
        return cls(
            database_url=database_url,
            db_max_connections=_positive_int(os.environ.get("DB_MAX_CONNECTIONS"), 10),
            port=_positive_int(os.environ.get("PORT"), 4830),
        )
