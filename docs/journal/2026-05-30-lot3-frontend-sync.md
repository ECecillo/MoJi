# 2026-05-30 (8) — Lot 3 sprint 4 : Synchronisation Frontend & Clôture Lot 3

## Objectif de la session

Finaliser le Lot 3 en connectant le frontend au backend pour la synchronisation de la progression.

1. Créer un port `SyncClient` et son adapter `RestSyncClient`.
2. Intégrer la logique de synchronisation dans le hook `useProgress`.
3. Assurer la persistance locale et distante (stratégie Batch Upsert).

## Ce qui a été fait

### Infrastructure Frontend (`frontend/src/domain/ports/SyncClient.ts`, `frontend/src/adapters/api/RestSyncClient.ts`)

- Définition du port `SyncClient` avec les méthodes `pull()` et `push()`.
- Implémentation de `RestSyncClient` utilisant `fetch` sur `/api/progress`.
- Ajout de tests unitaires pour `RestSyncClient` avec mock de `fetch`.

### Logique de Synchronisation (`frontend/src/features/progress/useProgress.ts`)

- Mise à jour du port `ProgressRepository` pour inclure `upsertBatch`.
- Implémentation de `upsertBatch` dans `LocalStorageProgressRepository`.
- Intégration de la sync dans le hook `useProgress` :
    - **Auto-sync au chargement** : pull depuis le serveur, merge local (last one wins), puis push local vers serveur pour s'assurer que les deux sont synchronisés.
    - **Background-sync après session** : push automatique vers le serveur dès qu'une session est enregistrée.
- Gestion des états `loading` (chargement initial) et `syncing` (opération réseau en cours).

### Maintenance technique

- Correction de tous les warnings de lint (variables inutilisées) introduits lors du sprint précédent.
- Mise à jour de `useProgress.test.tsx` pour mocker `SyncClient` et éviter les erreurs d'URL invalides lors des tests unitaires.

## Vérifications

- `make test` : **201 tests front passent** (3 nouveaux tests pour `RestSyncClient`).
- `make test-e2e` : **28/28 tests E2E passent**. La synchronisation est transparente et ne casse pas la persistance `localStorage` existante.
- Build de production : OK.

## Clôture du Lot 3 — Système de révision

Le Lot 3 est officiellement terminé.
- ✅ Moteur SRS SM-2 fonctionnel.
- ✅ Dashboard et indicateurs visuels intégrés.
- ✅ Synchronisation backend (Go + SQLite) opérationnelle.
- ✅ Architecture hexagonale respectée sur toute la chaîne.

## Prochaines étapes — Lot 4 Synthèse Vocale

- RFC pour l'intégration de la synthèse vocale (`SpeechSynthesis` API).
- Port `SpeechProvider` et adapter navigateur.
- Ajout de boutons "Écouter" dans le Glossaire et le Canvas.
