# 2026-06-14 — Fix CI (timeout Vitest) + image multi-arch arm64

## Contexte

La CI GitHub Actions (RFC 0013) échouait sur le job `frontend` (Vitest), et besoin
d'une image arm64 pour un déploiement Raspberry Pi.

## CI : timeout Vitest

- **Diagnostic** (via `gh run view --log-failed`) : 3 tests de composants échouaient sur
  `Test timed out in 5000ms` (App.test ×1, Glossary.test ×2). Cause : depuis l'import
  HSK 2 (RFC 0012), ces tests chargent et valident (Zod) ~600 caractères / ~1250 mots ;
  sur le runner CI (2 cœurs, plus lent que le poste local) ça dépasse le défaut de 5 s.
  Pas un bug de logique — un timeout. (Les lignes `Invalid URL: /api/progress` du log
  sont du bruit `console.debug` du sync best-effort, attrapé.)
- **Correctif** : `vite.config.ts` → `testTimeout: 20000`, `hookTimeout: 20000`.

## Image multi-arch (arm64 Raspberry Pi)

- `Dockerfile` rendu cross-compile-friendly : étapes de build sur `$BUILDPLATFORM`,
  binaire Go cross-compilé via `ARG TARGETOS/TARGETARCH` + `GOOS/GOARCH` (le bundle JS
  est indépendant de l'arch, le runtime `alpine` prend l'arch cible). Sûr pour les builds
  natifs (BuildKit fournit `TARGETARCH`=host par défaut).
- `make docker-buildx-arm64` : crée au besoin un builder `docker-container` et produit
  `sinogrammes-arm64.tar` (transférable par scp + `docker load`). `.tar` gitignoré.
- README : section « Raspberry Pi (arm64) » — builder sur le Pi, ou cross-builder + transférer.

## Vérifications

- `npm run test` : 244 tests OK (le timeout ne change rien en local).
- `make docker-buildx-arm64` : tar produit ; `docker load` + `docker image inspect` →
  **Architecture: arm64 / Os: linux** confirmé.
- Push → la CI doit repasser au vert (timeout levé).

## Décisions

- Timeout Vitest relevé globalement (tests d'intégration légitimement lents sur le jeu
  HSK 1+2) plutôt que d'injecter un jeu réduit (refactor plus invasif des composants).
- Image multi-arch via cross-compilation Go (rapide, sans émulation QEMU du build Go).
