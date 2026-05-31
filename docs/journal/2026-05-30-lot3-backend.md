# 2026-05-30 (7) — Lot 3 sprint 3 : Backend Infrastructure

## Objectif de la session

Mettre en place l'infrastructure backend pour la synchronisation de la progression utilisateur (Lot 3).

1. Modèles de domaine pour la progression.
2. Persistance SQLite (sans cgo) avec migrations SQL.
3. API REST `/api/progress` (List et UpsertBatch).
4. Tests unitaires et d'intégration.

## Ce qui a été fait

### Domaine et Ports (`backend/internal/domain/`, `backend/internal/ports/`)

- Définition de `ProgressEntry`, `SrsState`, `ProgressStats` et `ProgressTargetRef` en Go, calqués sur le modèle frontend.
- Définition du port `ProgressStore` (interface).

### Persistance (`backend/internal/adapters/sqlite/`)

- Utilisation de `modernc.org/sqlite` (pure Go) pour faciliter le déploiement.
- Mise en place de **Goose** pour les migrations SQL.
- Migration `20260530120000_create_progress.sql` : création de la table `progress`.
- Implémentation de `ProgressStore` avec support du **ON CONFLICT DO UPDATE** pour l'upsert batch efficace.
- `OpenDB` gère la création automatique du répertoire de la base de données.

### API HTTP (`backend/internal/adapters/http/`)

- `ProgressHandler` : implémente `GET /api/progress` (liste) et `POST /api/progress` (batch upsert).
- Utilisation de JSON pour les échanges.
- Injection de dépendance du repository dans le serveur.

### Configuration (`backend/internal/config/`)

- Ajout de `SINO_DB_PATH` (défaut: `data/sinogrammes.db`) et `SINO_MIGRATIONS_DIR` (défaut: `migrations`).

### Tests

- `backend/internal/adapters/sqlite/progress_repository_test.go` : tests CRUD complets avec base en mémoire.
- `backend/internal/adapters/http/progress_handler_test.go` : tests des endpoints avec mock du store.
- Mise à jour de `health_test.go` pour s'adapter au changement de signature de `NewServer`.

## Vérifications

- `make test` : **198 tests front passent**, **tous les tests back passent** (adapters http, sqlite, config).
- `make lint` back (golangci-lint) : OK.
- Build back : OK.

## Notes

- La stratégie choisie est le **Batch Upsert** (Simple). Le client envoie tout son état local, le serveur l'écrase. C'est suffisant pour le volume HSK 1 et simplifie énormément la gestion des conflits pour un usage mono-utilisateur.
- Pas de CGO nécessaire grâce à `modernc.org/sqlite`.

## Prochaines étapes — Lot 3 intégration

- Côté frontend : implémenter `RestSyncClient` (port `SyncClient` ou extension de `ProgressRepository`).
- Déclencher la synchronisation au focus de l'application ou après une session de révision.
