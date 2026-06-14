# RFC 0013 — Déploiement auto-hébergé (Docker) et intégration continue

- **Statut** : Accepté
- **Date** : 2026-06-13
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0007 (découpage en lots — post-MVP), RFC 0011 (sync backend / single-origin)

## Contexte

Le MVP (Lots 0–5) est complet, mais le serveur ne tournait qu'en foreground via
`make serve` sur le poste de dev (LAN, machine allumée). RFC 0007 liste « Docker / CI /
déploiement formalisé » en post-MVP. Objectif : un déploiement **auto-hébergé**
(VPS / serveur maison / Raspberry Pi) reproductible, persistant et auto-redémarrant,
plus une CI qui rejoue les barrières sous la toolchain pinnée.

## Décision

### Image Docker single-origin

Un **`Dockerfile` multi-étapes** à la racine produit une image unique qui sert la PWA
**et** l'API (single-origin, cf. RFC 0011) :

1. `node:24.15.0-alpine` : `npm ci` puis **`npx vite build`** → `dist/`. On invoque
   `vite build` directement, pas `npm run build` (qui enchaîne `tsc --noEmit`) : le
   typecheck strict est la responsabilité de la CI, et l'image n'embarque pas `shared/`.
2. `golang:1.26.2-alpine` : `CGO_ENABLED=0 go build` → **binaire statique** (SQLite est
   pur-Go via `modernc.org/sqlite`, aucune dépendance C).
3. `alpine:3.20` : binaire + `backend/migrations/` (lues au runtime par goose) +
   `dist/`, utilisateur **non-root**, `HEALTHCHECK` sur `/health`, variables
   `SINO_*` pré-réglées (`STATIC_DIR=/app/dist`, `DB_PATH=/data/sinogrammes.db`,
   `MIGRATIONS_DIR=/app/migrations`, `HOST=0.0.0.0`).

### Persistance et orchestration

**`docker-compose.yml`** : un service `sinogrammes`, **volume nommé** `sinogrammes-data`
monté sur `/data` (base SQLite persistante), `restart: unless-stopped`, healthcheck.
`docker compose up -d --build`, puis `http://<hôte>:8787`. Raccourcis `make docker-up` /
`docker-down` / `docker-build` (la CI, elle, n'utilise pas le Makefile).

### Intégration continue

**`.github/workflows/ci.yml`** (push `main` + pull requests), trois jobs :

- **frontend** : `npx vitest run`, `npx eslint .`, `npx prettier --check .`,
  `npx tsc --noEmit`, `npx playwright test`.
- **backend** : `go test ./... -race`, `golangci-lint run ./...`.
- **docker** : `docker build` (sanity).

La CI **appelle les outils directement** (pas le Makefile) pour rester indépendante du
task runner. La toolchain est provisionnée par **`jdx/mise-action`** depuis `mise.toml`
(parité de version exacte, dont **Node 24.15.0** — Node 25 casse le `localStorage` de
jsdom et ferait échouer les tests).

## Conséquences

- **Sécurité** : cet incrément livrait l'API **non authentifiée** (réseau de confiance).
  Le durcissement (jeton d'accès + transport chiffré) est désormais traité par la
  **[RFC 0014](0014-securite-api.md)** : jeton `SINO_API_TOKEN` + accès Tailscale HTTPS.
- **Aucun changement de code applicatif** : uniquement de l'infra et de la doc.
- Le binaire statique + Alpine donnent une image légère, multi-arch possible (amd64/arm64
  pour Raspberry Pi) via buildx si besoin.

## Alternatives considérées

- **PaaS managé (Fly.io / Render)** : écarté au profit de l'auto-hébergement (choix
  utilisateur) ; l'image Docker reste compatible si un PaaS est retenu plus tard.
- **Image `distroless`/`scratch`** : plus minimale, mais Alpine offre un shell + `wget`
  (healthcheck, debug) pour un coût négligeable — préféré pour un usage auto-hébergé.
- **CI via `make`** : écarté pour découpler la CI du task runner.
- **Embarquer les migrations dans le binaire (`embed`)** : possible plus tard ; pour
  l'instant elles sont copiées dans l'image (simple, déjà lues depuis un répertoire).
