.PHONY: dev test up down ingest lint fmt mobile

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

ingest:
	cd backend && python -m app.ingest.run all

mobile:
	cd mobile && npx expo start
