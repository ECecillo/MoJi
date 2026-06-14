# 2026-06-14 — Sécurité : authentification de l'API (jeton) + Tailscale

## Objectif

Suite du déploiement (RFC 0013) : sécuriser l'API pour un déploiement chez soi accessible
via Tailscale. RFC 0014.

## Ce qui a été fait

### Backend
- `config.go` : `APIToken` ← `SINO_API_TOKEN` (vide = auth désactivée). + tests.
- `auth.go` : middleware `requireBearerToken` — 401 si en-tête absent/incorrect,
  comparaison constant-time (`crypto/subtle`).
- `server.go` : `NewServer(store, staticDir, apiToken)` ; groupe `/api` avec le middleware
  **seulement si un jeton est configuré** ; `/health` et le statique restent publics.
  Appelants mis à jour (`main.go`, tests).
- `auth_test.go` : 401 sans/mauvais/Basic, 200 avec le bon jeton, `/health` public,
  auth désactivée quand vide.

### Frontend
- `lib/syncToken.ts` (+test) : lecture/écriture du jeton en localStorage (clé
  `sinogrammes:sync:api-token`).
- `RestSyncClient` : `Authorization: Bearer <token>` sur pull+push (jeton lu à chaque
  requête via getter par défaut), message clair sur 401. Tests mis à jour/étendus.
- `useProgress` : expose `syncError` (posé dans le catch, vidé au succès).
- `Dashboard` : section « Synchronisation » — champ jeton (password) + Enregistrer →
  `writeApiToken` + `sync()` + statut (synchronisé / erreur). i18n FR/EN.

### Déploiement
- `docker-compose.yml` : `SINO_API_TOKEN: ${SINO_API_TOKEN:-}` (sourcé hôte/`.env`).
- `.env.example` (+ `.env` gitignoré et exclu du contexte Docker).

## Décisions (RFC 0014)

- **Jeton partagé opt-in** (mono-utilisateur) ; vide = ouvert (rétro-compatible).
- **Accès Tailscale + `tailscale serve` HTTPS** : chiffre le jeton **et** fournit le
  *secure context* indispensable à l'enregistrement du service worker (offline/PWA). Une
  IP LAN en HTTP nu ne permet pas le SW.
- Shell PWA public, donnée derrière le jeton. `/health` public (healthcheck).

## Vérifications

- **Backend** : `go test ./... -race` (auth + config) OK, `golangci-lint` 0 issue.
- **Front** : `npx vitest run` (syncToken, RestSyncClient header/401, useProgress) OK,
  eslint/prettier/tsc OK.
- **E2E** : `e2e/sync.spec.ts` étendu — asserte l'en-tête `Authorization: Bearer` au sync.
- **Manuel Docker** : `docker run -e SINO_API_TOKEN=secret` → `/api/progress` 401 sans
  en-tête, 200 avec `Authorization: Bearer secret` ; `/health` 200 sans jeton.

## Reste / pistes

- Rotation de jeton / révocation par appareil, rate-limiting : non nécessaires derrière
  Tailscale (pas d'exposition publique). À prévoir si exposition publique un jour.
