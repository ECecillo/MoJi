# CURRENT_STATE — état courant du projet

> **Fichier toujours à jour.** À mettre à jour à la fin de chaque session de travail. Répond à la question : "où en est le projet, là, maintenant ?"

**Dernière mise à jour** : 2026-05-24

## Lot en cours

**Lot 0 — Fondations** : ✅ **terminé**.

L'arborescence du monorepo est en place, la chaîne d'outils tourne vert des deux côtés, la documentation est complète et la discipline hexagonale est posée dès le premier fichier. Aucun code applicatif (canvas, glossaire, SRS) n'a encore été écrit — c'est attendu, ces fonctionnalités appartiennent aux lots suivants.

## Ce qui est fait (Lot 0)

### Documentation
- ✅ `BRIEF.md` lu et figé.
- ✅ `CLAUDE.md` racine (point d'entrée pour Claude Code, pointe vers ce fichier).
- ✅ `AGENTS.md` racine (miroir cross-outils de `CLAUDE.md`, auto-géré).
- ✅ `README.md` racine.
- ✅ Sept RFC fondatrices acceptées (vision, stack, hexagonal, données/versioning, i18n, PWA offline-first, découpage en lots).
- ✅ `docs/journal/` initialisé avec deux entrées (init + clôture Lot 0).
- ✅ Ce fichier.

### Monorepo et tooling
- ✅ `.gitignore`, `.editorconfig`, `Makefile` racine.
- ✅ Cibles racine vérifiées : `make help`, `make install`, `make dev`, `make test`, `make lint`, `make typecheck`, `make build`, `make clean`.

### Données partagées
- ✅ `shared/schema/data-schema.v1.json` — JSON Schema officiel v1.0.0, **source de vérité unique** des types front et back.
- ✅ `shared/schema/examples/hsk1_sample.json` — fixture conforme utilisée par les tests Zod côté front.

### Backend Go (hexagonal, plug-and-play)
- ✅ `backend/` : module `sinogrammes/backend`, Go 1.26 disponible (≥ 1.22 requis).
- ✅ Structure hexagonale : `cmd/server/`, `internal/{domain,ports,adapters/{http,sqlite},migrations,config}/`.
- ✅ Endpoint `/health` testé en TDD avec testify, renvoie `{"status":"ok","schema_version":"1.0.0"}`.
- ✅ Routeur chi avec middlewares (RequestID, Recoverer), package nommé `httpapi` pour éviter le conflit stdlib.
- ✅ Config via env (`SINO_HOST`, `SINO_PORT`) avec tests sur défauts/overrides/erreurs.
- ✅ Main avec graceful shutdown (SIGINT/SIGTERM, timeout 5s).
- ✅ `.golangci.yml` (v2 strict : errcheck, govet, staticcheck, gosec, revive, gocritic, …) — **0 issue**.
- ✅ `backend/Makefile` local (dev/build/test/lint/tidy/clean).

### Frontend React/TS strict (hexagonal, e-ink-aware)
- ✅ Vite 5 + React 18 + TS strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`) + Tailwind 3 + Vitest 2 + ESLint 8 + Prettier 3.
- ✅ Structure hexagonale : `src/{domain/{schema,migrations,ports},adapters/{renderer,storage,api},features,ui,i18n,lib,test}`.
- ✅ Garde-fou ESLint `no-restricted-imports` : interdit `domain/ → adapters/` (override sur `adapters/`, `features/`, `ui/`, `main.tsx`, `App.tsx`).
- ✅ Ports définis : `CharacterRenderer`, `ProgressRepository`, `DataSource`.
- ✅ Schéma de données : `types.ts` (TS) + `validators.ts` (Zod) + 15 tests sur fixture HSK 1 et cas invalides (id, ton, hanzi, langue, strict, etc.).
- ✅ Système de migrations : orchestrateur `applyMigrations` + 6 tests (chaînage, no-op, erreur sans chemin, erreur version non mise à jour, détection de boucle).
- ✅ i18n : i18next + react-i18next + LanguageDetector, locales `fr`/`en` dès le démarrage.
- ✅ Composant `App` avec toggle FR/EN + 3 tests Testing Library.

### Vérifications croisées
- ✅ `make test` : 24 tests front passent + 2 paquets back passent avec `-race`.
- ✅ `make lint` : ESLint + Prettier clean + golangci-lint 0 issue.
- ✅ `make typecheck` : `tsc --noEmit` clean.
- ✅ `make build` : front build produit `dist/` (203 KB JS / 65 KB gzip), back binaire `bin/server`.
- ✅ `make dev` : smoke-testé, back répond `/health` et front sert `index.html` sur leurs ports respectifs (8787 / 5173).

## Dernières décisions importantes

- 2026-05-24 : adoption des **sept RFC fondatrices**.
- 2026-05-24 : **OS de développement = macOS** (Go 1.26.2, Node 24.15, npm 11.12, GNU make 3.81, golangci-lint 2.9).
- 2026-05-24 : module Go nommé `sinogrammes/backend` (chemin local, non publié sur GitHub).
- 2026-05-24 : package Go de l'adaptateur HTTP renommé `httpapi` (le dossier reste `internal/adapters/http/`) pour éviter le conflit avec `net/http`.
- 2026-05-24 : abandon des project references TypeScript au profit d'un `tsconfig.json` unique qui couvre `src/` + `vite.config.ts` — plus simple, suffisant pour un mono-utilisateur.

## Bloquants connus

Aucun.

## Prochaines étapes (Lot 1 — Canvas et validation de tracé)

Cf. [RFC 0007](../rfc/0007-decoupage-en-lots.md). Avant de coder, prévoir :

1. **Sourcing des données HSK 3.0 niveau 1** : trouver une liste publique propre (300 caractères + 500 mots). Plus utile en début de Lot 1 que de stub avec quelques caractères.
2. **Intégration de Hanzi Writer** derrière `CharacterRenderer` dans `src/adapters/renderer/HanziWriterRenderer.ts`.
3. **Capture stylet via Pointer Events** (pression / inclinaison), composant `<Canvas />` dans `features/canvas/`.
4. **Grilles d'aide** Tian/Mi/Hui Zi Ge — composants dans `ui/` ou `features/canvas/`.
5. **Modes d'affichage** : modèle semi-transparent vs caché.
6. **Validation de l'ordre et de la direction des traits** — déléguée à Hanzi Writer via le port.
7. **UX e-ink** : noir/blanc strict, pas d'animation gratuite, redraw minimisé.

À ne pas oublier d'ouvrir au début du Lot 1 :

- Une nouvelle entrée de journal à chaque session.
- Une RFC dès qu'une décision structurante émerge (par ex. : choix exact du sourcing HSK, mécanisme de capture stylet, stratégie e-ink détaillée).

## Liens utiles

- Brief figé : [`../../BRIEF.md`](../../BRIEF.md)
- Index des RFC : [`../rfc/README.md`](../rfc/README.md)
- Index du journal : [`../journal/README.md`](../journal/README.md)
- Dernière entrée de journal : [`../journal/2026-05-24-lot0-fondations.md`](../journal/2026-05-24-lot0-fondations.md)
