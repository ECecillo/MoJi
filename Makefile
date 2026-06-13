# Makefile racine — orchestration front + back.
# Toutes les recettes utilisent /bin/sh (POSIX) pour rester portables.
# Cf. CLAUDE.md et docs/handoff/CURRENT_STATE.md pour les conventions.

SHELL := /bin/sh

.PHONY: help install dev dev-front dev-front-lan dev-back \
        test test-front test-back test-e2e \
        lint lint-front lint-back \
        typecheck build build-front build-back \
        vendor-sources build-data build-icons docs serve \
        docker-build docker-up docker-down \
        clean

help:
	@echo "Cibles disponibles :"
	@echo "  make install     — installe les dépendances front (npm) et back (go mod)"
	@echo "  make dev         — lance front (Vite) et back (Go) en parallèle"
	@echo "  make dev-front-lan — lance le front accessible depuis le réseau local"
	@echo "  make test        — exécute les tests unitaires des deux côtés"
	@echo "  make test-e2e    — exécute les tests E2E Playwright (Chromium)"
	@echo "  make lint        — exécute lint + format check des deux côtés"
	@echo "  make typecheck   — typecheck strict TypeScript"
	@echo "  make build       — compile front et back"
	@echo "  make serve       — build + sert front ET API sur une seule origine (LAN, cf. RFC 0011)"
	@echo "  make docker-up   — build l'image et lance le conteneur (docker compose, cf. RFC 0013)"
	@echo "  make docker-down — arrête le conteneur"
	@echo "  make vendor-sources — rafraîchit shared/data/sources/ depuis les SHA upstream (rare, réseau)"
	@echo "  make build-data  — régénère frontend/src/data/hsk1.generated.json (offline)"
	@echo "  make build-icons — régénère les icônes PNG de la PWA (192/512, via Chromium Playwright)"
	@echo "  make docs        — régénère docs/index.html (carnet de bord HTML)"
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

dev-front-lan:
	cd frontend && npm run dev -- --host 0.0.0.0

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

# Tests end-to-end (Playwright, Chromium). Plus lents, à lancer
# manuellement avant un push (cf. RFC 0009).
test-e2e:
	cd frontend && npm run test:e2e

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

# ─────────── déploiement single-origin (cf. RFC 0011) ───────────

# Construit le front puis lance le backend qui sert le dist/ ET l'API sur une
# seule origine, accessible depuis le réseau local. La Boox et l'ordinateur
# ouvrent http://<ip-de-cette-machine>:8787 et installent la PWA depuis là.
serve: build
	cd backend && SINO_STATIC_DIR=../frontend/dist SINO_HOST=0.0.0.0 ./bin/server

# ─────────── déploiement Docker (cf. RFC 0013) ───────────
# Raccourcis développeur — la CI, elle, n'utilise pas le Makefile.

docker-build:
	docker build -t sinogrammes:latest .

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

# ─────────── data pipeline (cf. RFC 0008) ───────────

vendor-sources:
	cd frontend && npm run vendor:sources

build-data:
	cd frontend && npm run build:data

build-icons:
	cd frontend && npm run build:icons

# ─────────── carnet de bord HTML ───────────

docs:
	cd frontend && npm run build:docs

# ─────────── clean ───────────

clean:
	rm -rf frontend/dist frontend/coverage
	rm -rf backend/bin backend/coverage.out backend/coverage.html
