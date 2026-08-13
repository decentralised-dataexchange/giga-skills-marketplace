from __future__ import annotations

import uvicorn

from marketplace.config import Settings


def main() -> None:
    settings = Settings.from_env()
    uvicorn.run(
        "marketplace.main:app",
        host="0.0.0.0",
        port=settings.port,
    )


if __name__ == "__main__":
    main()
