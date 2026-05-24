# Makefile racine — orchestration front + back.
# Toutes les recettes utilisent /bin/sh (POSIX) pour rester portables.
# Cf. CLAUDE.md et docs/handoff/CURRENT_STATE.md pour les conventions.

SHELL := /bin/sh

.PHONY: help install dev dev-front dev-back \
        test test-front test-back \
        lint lint-front lint-back \
        typecheck build build-front build-back \
        clean

help:
	@echo "Cibles disponibles :"
	@echo "  make install     — installe les dépendances front (npm) et back (go mod)"
	@echo "  make dev         — lance front (Vite) et back (Go) en parallèle"
	@echo "  make test        — exécute les tests des deux côtés"
	@echo "  make lint        — exécute lint + format check des deux côtés"
	@echo "  make typecheck   — typecheck strict TypeScript"
	@echo "  make build       — compile front et back"
	@echo "  make clean       — nettoie artefacts de build et caches"
	@echo ""
	@echo "Cibles ciblées : *-front, *-back (ex. make test-front)."

# ─────────── installation ───────────

install:
	cd frontend && npm install
	cd backend && go mod download

# ─────────── dev ───────────

dev-front:
	cd frontend && npm run dev

dev-back:
	cd backend && go run ./cmd/server

# Lance les deux serveurs en parallèle. Ctrl-C arrête les deux.
dev:
	@echo "→ démarrage front (http://127.0.0.1:5173) + back (http://127.0.0.1:8787)"
	@trap 'kill 0' INT TERM EXIT; \
		(cd frontend && npm run dev) & \
		(cd backend && go run ./cmd/server) & \
		wait

# ─────────── tests ───────────

test-front:
	cd frontend && npm test

test-back:
	cd backend && go test ./... -race -count=1

test: test-front test-back

# ─────────── lint ───────────

lint-front:
	cd frontend && npm run lint

lint-back:
	cd backend && golangci-lint run ./...

lint: lint-front lint-back

# ─────────── typecheck ───────────

typecheck:
	cd frontend && npm run typecheck

# ─────────── build ───────────

build-front:
	cd frontend && npm run build

build-back:
	cd backend && mkdir -p bin && go build -o bin/server ./cmd/server

build: build-front build-back

# ─────────── clean ───────────

clean:
	rm -rf frontend/dist frontend/coverage
	rm -rf backend/bin backend/coverage.out backend/coverage.html
