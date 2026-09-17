# ITU Skills Marketplace developer routines.
# PostgreSQL always runs in Docker; the apps run on the host for hot reload.

DB_URL         ?= postgresql://govbuild:govbuild-dev@localhost:5433/govbuild

.DEFAULT_GOAL := help
.PHONY: help db db-stop db-reset install web lint fmt fmt-check check up down reset

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

install: ## Install dependencies (root OXC tooling, web app)
	npm install
	cd web && npm install

web: ## Run the web app on :4820 (needs `make db`)
	cd web && DATABASE_URL="$(DB_URL)" npm run dev -- -p 4820

lint: ## Lint the repo with oxlint
	npm run lint

fmt: ## Format the repo with oxfmt (writes changes)
	npm run format

fmt-check: ## Check formatting with oxfmt (no writes)
	npm run format:check

check: ## Check all root/web lint, format, type, and test gates
	npm run format:check
	npm run lint
	cd web && npx tsc --noEmit && npx eslint app components lib

up: ## Build and run the full stack in Docker (postgres + web)
	docker compose up --build

down: ## Stop the full stack
	docker compose down

reset: ## Stop the full stack and wipe the database volume
	docker compose down -v
