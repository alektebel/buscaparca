.PHONY: dev test up down ingest serve-real lint fmt mobile

dev:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	cd backend && pytest -q
	cd mobile && npm test --silent

lint:
	cd backend && ruff check app tests && ruff format --check app tests
	cd mobile && npx tsc --noEmit

fmt:
	cd backend && ruff format app tests && ruff check --fix app tests

up:
	docker compose -f infra/docker-compose.yml up -d --build

down:
	docker compose -f infra/docker-compose.yml down

SQLITE ?= $(CURDIR)/data/buscaparca.db

ingest:
	cd backend && BUSCAPARCA_SQLITE_PATH=$(SQLITE) python -m app.ingest.run all

serve-real:
	cd backend && BUSCAPARCA_SQLITE_PATH=$(SQLITE) uvicorn app.main:app --host 0.0.0.0 --port 8000

mobile:
	cd mobile && npx expo start
