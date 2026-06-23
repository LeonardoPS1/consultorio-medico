# =============================================================================
# Makefile — Consultorio Médico (AicoreMed)
# Tareas comunes para desarrollo, CI y deploy
# =============================================================================

SHELL := /bin/bash
.PHONY: help setup install dev build lint format type-check test ci deploy docker-up docker-down clean

help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Setup ──────────────────────────────────────────────────────────────────

setup: install ## Instalación completa

install: ## Instala dependencias del monorepo
	pnpm install

# ─── Desarrollo ─────────────────────────────────────────────────────────────

dev: ## Inicia servidor de desarrollo (dashboard)
	pnpm dev

build: ## Build de producción (dashboard)
	pnpm build

# ─── Calidad de código ─────────────────────────────────────────────────────

lint: ## Ejecuta ESLint en dashboard
	pnpm lint

format: ## Formatea código con Prettier
	pnpm --filter ./dashboard format

format-check: ## Verifica formato sin modificar
	pnpm --filter ./dashboard format:check

type-check: ## Verificación de tipos TypeScript
	pnpm type-check

test: ## Ejecuta tests
	pnpm test

test-watch: ## Tests en modo watch
	pnpm --filter ./dashboard test:watch

# ─── CI / Validación completa ──────────────────────────────────────────────

ci: lint format-check type-check test build ## Pipeline CI completo

# ─── Base de datos ─────────────────────────────────────────────────────────

db-generate: ## Genera migración Drizzle
	pnpm --filter ./dashboard db:generate

db-push: ## Push schema a DB
	pnpm --filter ./dashboard db:push

db-studio: ## Abre Drizzle Studio
	pnpm --filter ./dashboard db:studio

# ─── Docker ────────────────────────────────────────────────────────────────

docker-up: ## Levanta servicios con Docker Compose
	docker compose up -d

docker-down: ## Detiene servicios
	docker compose down

docker-build: ## Build de imagen Docker sin caché
	docker compose build --no-cache dashboard

docker-logs: ## Logs de servicios Docker
	docker compose logs -f

# ─── Deploy ────────────────────────────────────────────────────────────────

deploy: ## Deploy a producción via VPS (Python)
	python deploy_vps.py

deploy-api: ## Deploy API pública a producción
	python deploy_vps_api.py

# ─── Utilidades ─────────────────────────────────────────────────────────────

clean: ## Limpia node_modules, .next, etc.
	rm -rf dashboard/.next dashboard/node_modules node_modules
	pnpm store prune

git-status: ## Muestra estado de git
	git status

git-log: ## Muestra últimos commits
	git log --oneline -10
