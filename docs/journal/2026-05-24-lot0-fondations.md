# 2026-05-24 — Lot 0, fondations en place

## Objectif de la session

Dérouler les étapes 2 à 4 du Plan de démarrage : arrêter l'OS de dev, initialiser le Lot 0 en TDD (schéma partagé, backend Go, frontend Vite/React, migrations), câbler le Makefile racine, valider `make dev/lint/test`, clôturer le Lot 0.

## Ce qui a été fait

### Tooling et fichiers racine
- Vérification de la toolchain : Go 1.26.2, Node 24.15, npm 11.12, GNU make 3.81, golangci-lint 2.9.0.
- `.gitignore` (macOS, node, go, env), `.editorconfig` (tab pour Go/Makefile, 2 espaces sinon).
- `Makefile` racine avec cibles `install / dev / test / lint / typecheck / build / clean` + variantes `*-front` / `*-back`.

### `shared/schema/`
- `data-schema.v1.json` : JSON Schema Draft 2020-12, mode `additionalProperties: false`, contraintes regex sur les IDs (`char_…`, `word_…`, `deck_…`), pinyin structuré (syllabe + ton 0–4), translations indexées ISO 639-1, refs externes `makemeahanzi:XXXX` pour les tracés, champ générique `metadata: {}`.
- `examples/hsk1_sample.json` : 2 caractères (你, 好) + 1 mot (你好) + 1 deck — sert de fixture aux tests Zod.

### `backend/` (Go, hexagonal)
- Module `sinogrammes/backend`. Structure `cmd/server/` + `internal/{domain,ports,adapters/{http,sqlite},migrations,config}/`.
- Tests d'abord (`health_test.go`, `config_test.go`), puis impl. Tests passent avec `-race`.
- Endpoint `/health` retourne `{"status":"ok","schema_version":"1.0.0"}`.
- Router chi avec `RequestID`, `Recoverer`. **`middleware.RealIP` retiré** (déprécié pour vulnérabilité IP spoofing, signalé par golangci-lint).
- Main avec `signal.NotifyContext` + graceful shutdown, refactor en `run() error` pour éviter `log.Fatalf` après `defer` (gocritic `exitAfterDefer`).
- `.golangci.yml` v2 strict (errcheck, gosec, staticcheck, revive, gocritic, …) — **0 issue** au final.

### `frontend/` (Vite/React/TS strict, hexagonal)
- `tsconfig.json` strict avec `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`.
- Vite 5 + React 18 + Tailwind 3 + Vitest 2 + ESLint 8 + Prettier 3, `i18next` + `react-i18next` + `i18next-browser-languagedetector` dès le démarrage.
- Palette Tailwind sobre (`ink`, `paper`) pensée pour l'e-ink.
- `App.tsx` : titre + greeting + toggle FR/EN, 3 tests Testing Library.
- Garde-fou ESLint `no-restricted-imports` : `src/domain/` ne peut pas importer `src/adapters/`. Vérifiable au lint.
- Ports : `CharacterRenderer`, `ProgressRepository`, `DataSource` — interfaces seules, aucune implémentation.
- Schéma : `types.ts` (TS) + `validators.ts` (Zod) + 15 tests (fixture HSK 1 valide + cas invalides : id mal préfixé, ton hors plage, hanzi vide ou multi-char, langue non ISO 639-1, translations vides, champ inconnu).
- Migrations : `applyMigrations` (chaînage, détection de boucle, vérification de `to`), `REGISTERED_MIGRATIONS = []`, 6 tests sur migrations factices, README qui figent la convention.

### Vérifications de bout en bout
- `make test` : **24 tests front passent**, **2 paquets back passent avec `-race`**.
- `make lint` : ESLint + Prettier clean, golangci-lint 0 issue.
- `make typecheck` : `tsc --noEmit` clean.
- `make build` : front bundle 203 KB / 65 KB gzip, back binaire `bin/server`.
- `make dev` : smoke-testé en background → `/health` répond JSON correct, frontend sert l'`index.html` avec react-refresh.

## Découvertes / surprises

- **`go-chi/v5` middleware `RealIP` est désormais déprécié** (vulnérabilités IP spoofing récentes — GHSA-3fxj-6jh8-hvhx, etc.). Retiré : sur localhost et derrière un reverse proxy de confiance, RequestID + Recoverer suffisent.
- **`revive` interdit `package http`** (collision stdlib). Renommage en `httpapi` du package, le dossier reste `internal/adapters/http/` comme prévu par le brief.
- **TypeScript project references + composite + `noEmit`** posent un casse-tête (`TS6310 may not disable emit`). Abandonné au profit d'un `tsconfig.json` unique : suffisant pour un mono-utilisateur, supprime un point de friction inutile.
- **`AGENTS.md` est apparu spontanément** à la racine, miroir de `CLAUDE.md`. Probablement un hook cross-outils (convention partagée par Cursor / Aider / etc.). Laissé en l'état, non intrusif.
- Le sous-shell `cd` persiste entre les appels `Bash` dans la même session — utile à savoir.

## Décisions prises

Aucune nouvelle RFC. Tout reste cohérent avec les RFC 0001-0007. Les choix techniques arbitrés en cours de session sont consignés dans `CURRENT_STATE.md` (renommage de package, Module Go local, abandon des project references TS).

## Reste à faire / prochaines étapes

- **Premier commit du projet** (pas encore effectué — à confirmer avec l'utilisateur quel découpage il préfère : un commit géant "Lot 0" ou plusieurs commits thématiques).
- **Lot 1 — Canvas et validation de tracé** (cf. RFC 0007). Tout est listé dans `CURRENT_STATE.md` section "Prochaines étapes". Priorité 1 : sourcer une liste HSK 3.0 niveau 1 propre.
