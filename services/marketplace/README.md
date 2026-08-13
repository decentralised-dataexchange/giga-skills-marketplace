# Marketplace API

The public catalog API is a Python 3.12 FastAPI service managed with
[uv](https://docs.astral.sh/uv/).

```bash
uv sync
DATABASE_URL=postgresql://govbuild:govbuild-dev@localhost:5433/govbuild \
  uv run uvicorn marketplace.main:app --reload --port 4830
```

Run its checks with `uv run ruff check .`, `uv run ruff format --check .`, and
`uv run pytest`.
