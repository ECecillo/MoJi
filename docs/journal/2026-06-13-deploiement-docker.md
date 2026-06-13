# 2026-06-13 — Déploiement auto-hébergé (Docker + CI)

## Objectif

Premier chantier post-MVP : déploiement auto-hébergé reproductible (RFC 0013).
Une image Docker single-origin (PWA + API + SQLite), orchestrée par docker-compose,
plus une CI GitHub Actions sous toolchain pinnée.

## Ce qui a été fait

- **`Dockerfile`** multi-étapes : front (`node:24.15.0-alpine`, `npx vite build`),
  Go statique (`golang:1.26.2-alpine`, `CGO_ENABLED=0`), runtime `alpine:3.20`
  non-root avec binaire + `migrations/` + `dist/`, env `SINO_*`, `HEALTHCHECK /health`.
  `npx vite build` (et non `npm run build`) : le typecheck est l'affaire de la CI,
  et l'image n'a pas besoin de `shared/`.
- **`.dockerignore`** : contexte minimal (exclut node_modules, dist, data, docs…).
- **`docker-compose.yml`** : service `sinogrammes`, volume nommé `/data`,
  `restart: unless-stopped`, healthcheck.
- **`.github/workflows/ci.yml`** : jobs frontend (vitest/eslint/prettier/tsc/playwright),
  backend (`go test -race`, golangci-lint), docker (build). Outils appelés **directement**
  (pas via `make`) pour découpler la CI du task runner ; toolchain via `jdx/mise-action`
  (parité de version, dont Node 24.15.0).
- **Makefile** : raccourcis `docker-build` / `docker-up` / `docker-down` + `make help`.
- **Docs** : RFC 0013, section README « Déploiement auto-hébergé », `CURRENT_STATE`.

## Vérifications

- **`docker build`** : OK (3 étapes, image construite). Première tentative en échec
  (`npm run build` → `tsc` typecheckait les tests important `shared/`, absent du contexte
  front) → corrigé en `npx vite build`.
- **`docker run`** (volume + port) : `/health` 200, `/` sert l'app, `POST`/`GET`
  `/api/progress` round-trip OK, **persistance confirmée après `docker restart`**,
  healthcheck `healthy`.
- **`docker compose config`** : valide. `make docker-up` bloqué uniquement par le port
  8787 déjà occupé localement (instance `make serve` en cours) — pas un souci de compose.
- CI : syntaxe écrite ; validée au premier push GitHub (non exécutable localement).

## Décisions (cf. RFC 0013)

- **Image single-origin auto-hébergée** (Alpine, binaire statique, SQLite sur volume).
- **CI indépendante du Makefile** (outils directs) + provisionnement par mise-action.
- **Sécurité** : API non authentifiée → LAN / réseau de confiance uniquement ; jeton
  d'accès + TLS requis avant toute exposition publique (incrément ultérieur).

## Reste / pistes

- Durcissement sécurité (jeton + reverse-proxy TLS) si exposition hors LAN.
- Image multi-arch (arm64) via buildx pour Raspberry Pi, au besoin.
- Migrations embarquées (`embed`) plus tard si on veut une image sans `migrations/`.
