# 2026-05-24 — Initialisation du projet

## Objectif de la session

Démarrer le projet sinogrammes à partir du brief de cadrage (`BRIEF.md`), en suivant l'étape 1 du "Plan de démarrage" : créer **toute la structure de documentation avant la moindre ligne de code applicatif**.

## Ce qui a été fait

- Lecture intégrale du brief (`BRIEF.md`, 12 sections, ~430 lignes).
- Création de **`CLAUDE.md`** à la racine : court, orienté action, pointe vers `docs/handoff/CURRENT_STATE.md` comme point d'entrée.
- Création de **`README.md`** à la racine : présentation humaine, statut, stack résumée.
- Création de l'arborescence `docs/` :
  - `docs/README.md` (index + conventions de navigation).
  - `docs/rfc/README.md` (index des RFC + statuts + en-tête type).
  - `docs/journal/README.md` (format des entrées + index).
  - `docs/handoff/CURRENT_STATE.md` (état initial : Lot 0 démarré, doc en place, prochaine étape = squelette frontend/backend).
- Rédaction des **sept RFC fondatrices**, toutes en français, statut "Accepté", datées du 2026-05-24 :
  - **RFC 0001 — Vision et périmètre** : mono-utilisateur, HSK 3.0 niveau 1, tracé sur Boox, contraintes e-ink, hors périmètre.
  - **RFC 0002 — Stack technique** : Vite/React/TS strict/Tailwind/Zod/i18next/Vitest côté front, Go/chi/SQLite/goose/testify côté back.
  - **RFC 0003 — Architecture hexagonale** : domain/ports/adapters des deux côtés, ports identifiés (CharacterRenderer, ProgressRepository, DataSource).
  - **RFC 0004 — Format de données et versioning** : JSON Schema unique dans `shared/schema/`, SemVer strict, migrations chaînées avec backup IndexedDB, tests obligatoires sur chaque migration.
  - **RFC 0005 — Stratégie i18n** : séparation stricte UI (i18next) vs données (`translations: { fr, en }` dans le schéma), locales FR/EN dès le Lot 0.
  - **RFC 0006 — PWA offline-first** : Option B (JSON bundlé) pour le MVP, IndexedDB local + SQLite serveur, sync best-effort Last-Write-Wins, service worker au Lot 5.
  - **RFC 0007 — Découpage en lots** : Lot 0 fondations / 1 canvas / 2 glossaire / 3 SRS / 4 voix / 5 PWA. Critères de sortie explicites par lot.
- Création de cette entrée de journal.

## Découvertes / surprises

- Le brief était déjà très complet : la rédaction des RFC consistait essentiellement à reformuler et structurer les décisions déjà actées, avec contexte / décision / conséquences / alternatives. Peu d'arbitrages nouveaux à faire à ce stade.
- Quatre fichiers étaient déjà préinitialisés vides à la racine et dans `docs/rfc/` (`CLAUDE.md`, `README.md`, `0001-...`, `0002-...`) — sans doute prévus par l'utilisateur en amont. Aucun conflit, simple remplissage.

## Décisions prises

Toutes les décisions structurantes du jour sont formalisées dans les RFC 0001 à 0007 (cf. liste ci-dessus). Aucune décision nouvelle hors brief.

## Reste à faire / prochaines étapes

- **Étape 2 du Plan de démarrage** : demander à l'utilisateur son OS de développement (Linux / macOS / Windows) pour figer les commandes du Makefile racine. ← à enchaîner immédiatement après cette session.
- **Étape 3 — Initialisation du Lot 0 en TDD** (prochaine session de travail) :
  1. `shared/schema/data-schema.v1.json` + fixture d'exemple.
  2. `backend/` : `go mod init`, structure de dossiers, endpoint `/health` en TDD, golangci-lint configuré.
  3. `frontend/` : Vite + React + TS strict + Tailwind + ESLint + Prettier + Vitest. Composant "Hello" avec toggle FR/EN i18next, testé.
  4. `frontend/src/domain/schema/` : types TS + validateurs Zod, tests sur fixtures.
  5. Squelette du système de migrations.
  6. `make dev`, `make lint`, `make test` à la racine.
- **Étape 4 — Clôture du Lot 0** : mettre à jour `CURRENT_STATE.md`, écrire l'entrée de journal correspondante, commit.
