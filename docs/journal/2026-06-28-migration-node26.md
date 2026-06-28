# 2026-06-28 — Migration toolchain vers Node 26.3.0 (+ shim localStorage de test)

## Contexte

Le projet était bloqué sur **Node 24.15.0** : sous Node récent, la suite Vitest
échouait massivement (`window.localStorage` undefined → `Cannot read properties of
undefined (reading 'clear')`). Objectif : débloquer la montée de version avant toute
nouvelle feature.

## Diagnostic

Reproduction sous Node 26.3.0 (`mise exec node@26.3.0 -- npx vitest run`) puis test
diagnostique : `window.localStorage` et le global `localStorage` sont `undefined`,
avec l'avertissement Node :

```
ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
```

**Cause racine** : Node ≥ 25 expose une **Web Storage API native** (`Storage` global,
`localStorage` gated derrière `--localstorage-file`). La simple présence de `Storage`
comme global empêche jsdom d'installer sa propre implémentation → `window.localStorage`
reste `undefined`.

Ce **n'est pas** un problème de version de jsdom ni de vitest : testé en bumpant
jsdom (25 → 26) et vitest (2 → 3) sous Node 26, l'échec persiste à l'identique. Bumper
ces paquets est donc inutile pour ce point.

## Correctif

Shim `localStorage`/`sessionStorage` en mémoire dans `frontend/src/test/setup.ts`,
installé **seulement si absent** (`if (window[key]) return;`). No-op sous Node 24 où
jsdom fournit déjà un `localStorage` fonctionnel ; rétablit un Storage conforme sous
Node ≥ 25. Indépendant des versions de Node/jsdom/vitest.

Aucun bump de paquet : **jsdom 25.0.1 / vitest 2.1.8 conservés**.

## Pins mis à jour (Node 24.15.0 → 26.3.0)

- `mise.toml` : `node = "26.3.0"`.
- `Dockerfile` : étape de build frontend `node:24.15.0-alpine` → `node:26.3.0-alpine`.
- `.github/workflows/ci.yml` : commentaire de toolchain mis à jour (mise-action lit `mise.toml`).
- `README.md` : mention d'install manuelle « Node 26.3.0 ».
- `docs/handoff/CURRENT_STATE.md` : avertissements toolchain + décisions actualisés.

## Vérifications

Sous **Node 26.3.0** :

- `npx vitest run` : **244/244** tests verts.
- `npm run typecheck` : OK.
- `npm run lint` (ESLint + Prettier) : OK.
- `npm run build` (tsc + vite build) : OK.

Sous **Node 24.15.0** (rétro-compat, shim = no-op) :

- `npx vitest run` : **244/244** tests verts.

## Décisions

- **Node épinglé à 26.3.0**, pas 25.x : Node 25 est une ligne *Current* non-LTS et
  n'était pas disponible via mise ; 26.3.0 est la ligne LTS paire et déjà vert. Le shim
  couvre tout Node ≥ 25.
- **Correctif au niveau du setup de test**, pas via `--localstorage-file` (qui
  persisterait dans un fichier partagé entre tests) ni via bump de paquet (sans effet).
- Traçabilité : journal + mise à jour de `CURRENT_STATE.md` (pas de RFC dédiée — pin
  réversible, pas de changement d'architecture).
