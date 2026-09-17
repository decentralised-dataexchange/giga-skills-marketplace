# Contributing

Thank you for your interest in the ITU Skills Marketplace. Issues and pull
requests are welcome.

## Development setup

Prerequisites: Docker, Node.js 22 and [uv](https://docs.astral.sh/uv/). The
`Makefile` wraps the common routines; `make help` lists them.

```bash
make db          # PostgreSQL in Docker (host port 5433)
make install     # dependencies for the web app and the root tooling
make web         # web app on :4820
```

Or run the full stack in Docker with `make up`. The schema bootstraps and
demo data seeds on the first web API request. See the
[README](README.md) for the environment variables; a standard development
run needs none.

## Quality gates

Run the same gates as CI before you open a pull request:

```bash
make check
```

This runs oxfmt (format check), oxlint, and tsc plus ESLint for the web app.
`make fmt` fixes formatting.

The Playwright end-to-end tests (`npm run test:e2e` in `web/`) expect the
seeded demo data, so run them against a fresh database (`make db-reset`
first).

## Pull requests

- Keep each pull request to one focused change.
- Make sure `make check` passes; CI runs the same gates on every push and
  pull request.
- Do not commit secrets. Local secret files (`web/.env.local`,
  `deploy/helm/giga/values-secret.yaml`) are gitignored on purpose.

## License

The project is licensed under the [Apache License 2.0](LICENSE). By
contributing, you agree that your contributions are licensed under the same
terms.
