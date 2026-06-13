# 2026-06-13 — Lot 3 : synchronisation backend de bout en bout

## Objectif de la session

Atteindre réellement le critère de sortie du Lot 3 (RFC 0007) : « faire une session
de révision quotidienne **et retrouver sa progression sur un autre appareil après
sync** ». L'infra existait mais trois trous la rendaient inopérante (cf. RFC 0011).

## Ce qui a été fait

### Backend (Go)

- **Service statique single-origin** (`internal/adapters/http/static.go`,
  `server.go`, `config`) : nouveau `SINO_STATIC_DIR`. `NewServer(store, staticDir)`
  sert le `dist/` avec fallback SPA vers `index.html` ; `/health` et `/api/progress`
  gardent la priorité. Les routes `/api/progress` sont enregistrées en **chemin exact
  sans slash** (ce que le client appelle), pour ne pas être avalées par le catch-all.
- **Merge par champ** (`progress_repository.go`) : clause `WHERE` ajoutée à l'upsert
  SQLite — le record entrant n'est adopté que s'il est plus avancé (plus d'`attempts`,
  ou à égalité `last_seen` plus récent).

### Frontend

- **`lib/progressMerge.ts`** (TDD) : `mergeEntry` / `mergeProgress`, règle symétrique
  avec le serveur, record entier adopté.
- **`useProgress.sync`** : passe de « upsert aveugle du distant » à **pull → merge →
  push**, protégeant le local plus avancé. Déclencheurs ajoutés : `focus`,
  `visibilitychange` (visible), `online`, avec garde anti-concurrence (`syncInFlight`).
- **Proxy Vite dev** : `/api → 127.0.0.1:8787` pour `make dev`.
- **Indicateur de sync** discret dans le footer (réutilise `syncing`), i18n FR/EN.

### Outillage / doc

- **`make serve`** : build front + lance le backend single-origin (`SINO_STATIC_DIR`,
  `SINO_HOST=0.0.0.0`) pour l'accès LAN. `make build-icons` ajouté au help.
- **RFC 0011** publiée ; CURRENT_STATE et carnet HTML mis à jour.

## Vérifications

Sous le Node épinglé (`mise exec node@24.15.0 -- …`) :

- `make test` : **229 tests front** (+ merge, +3 useProgress sync) + backend `-race`
  (merge par champ, service statique) OK.
- `make lint` / `make typecheck` : propres.
- `make test-e2e` : **30/30** (incl. `e2e/sync.spec.ts`, API mockée via `page.route`).
- **End-to-end HTTP réel** (binaire `make build` + `SINO_STATIC_DIR=frontend/dist`) :
  - `/` sert `index.html`, `/api/progress` répond du JSON ;
  - POST persiste, GET relit ;
  - merge par champ vérifié : un POST périmé (attempts 2 < 4) est ignoré, un POST plus
    avancé (attempts 9) gagne.

## Décisions prises (cf. RFC 0011)

- **Déploiement single-origin** : un binaire sert front + API, same-origin, zéro CORS.
- **Merge par champ sans horodatage** : plus d'attempts gagne, tie → last_seen ; schéma
  inchangé (pas de migration). Limite assumée : attempts non sommés entre appareils.
- **Sync best-effort** : silencieuse hors-ligne, déclenchée au focus/online en plus du
  chargement et des sessions.

## État du Lot 3

✅ **Critère de sortie atteint.** Révision locale (sprint 1) + persistance et sync
multi-appareils single-origin (cette session). Le binaire doit tourner sur un hôte
joignable par les deux appareils (`make serve`, `SINO_HOST=0.0.0.0` en LAN).

## Reste / pistes futures (hors Lot 3)

- Test d'installation/sync réel Boox ↔ ordinateur sur le LAN (nécessite le matériel).
- Si un besoin multi-appareils concurrent réel apparaît : envisager un horodatage ou un
  CRDT (sommation des compteurs) — sur-ingénierie pour l'instant.
