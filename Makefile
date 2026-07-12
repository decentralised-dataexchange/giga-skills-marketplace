# Giga Skills Marketplace developer routines.
# PostgreSQL always runs in Docker; the apps run on the host for hot reload.

DB_URL         ?= postgresql://govbuild:govbuild-dev@localhost:5433/govbuild
MARKETPLACE_URL ?= http://localhost:4830
INTERNAL_TOKEN ?= local-marketplace-token

.DEFAULT_GOAL := help
.PHONY: help db db-stop db-reset install marketplace web lint fmt fmt-check check up down reset

help: ## List available targets
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-13s\033[0m %s\n", $$1, $$2}'

db: ## Start PostgreSQL in Docker (port 5433)
	docker compose up -d postgres

db-stop: ## Stop PostgreSQL
	docker compose stop postgres

db-reset: ## Wipe and restart PostgreSQL (drops all data)
	docker compose down -v
	docker compose up -d postgres

install: ## Install dependencies (root OXC tooling, marketplace service, web app)
	npm install
	cd services/marketplace && npm install
	cd web && npm install

marketplace: ## Run the marketplace service on :4830 (needs `make db`)
	cd services/marketplace && DATABASE_URL="$(DB_URL)" MARKETPLACE_INTERNAL_TOKEN="$(INTERNAL_TOKEN)" npm run dev

web: ## Run the web app on :4820 (needs `make db` and `make marketplace`)
	cd web && DATABASE_URL="$(DB_URL)" MARKETPLACE_API_URL="$(MARKETPLACE_URL)" MARKETPLACE_INTERNAL_TOKEN="$(INTERNAL_TOKEN)" npm run dev -- -p 4820

lint: ## Lint the repo with oxlint
	npm run lint

fmt: ## Format the repo with oxfmt (writes changes)
	npm run format

fmt-check: ## Check formatting with oxfmt (no writes)
	npm run format:check

check: ## Format-check, oxlint, then typecheck and eslint the web app
	npm run format:check
	npm run lint
	cd web && npx tsc --noEmit && npx eslint app components lib

up: ## Build and run the full stack in Docker (postgres + marketplace + web)
	docker compose up --build

down: ## Stop the full stack
	docker compose down

reset: ## Stop the full stack and wipe the database volume
	docker compose down -v
