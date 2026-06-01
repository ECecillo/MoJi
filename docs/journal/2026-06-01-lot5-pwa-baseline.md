# 2026-06-01 — Lot 5 : socle PWA offline

## Objectif de la session

Démarrer le Lot 5 avec un socle PWA installable et un premier mode offline fiable pour le shell applicatif.

## Ce qui a été fait

- Ajout du manifest PWA (`frontend/public/manifest.webmanifest`) :
  - nom, description, langue, `start_url`, `scope`, `display: standalone`, couleurs ;
  - icônes SVG sobres adaptées e-ink (`icon.svg`, `icon-maskable.svg`).
- Ajout des meta PWA/mobile dans `frontend/index.html` :
  - `theme-color`, description, app name, apple mobile web app, manifest, favicon SVG.
- Ajout d'un service worker généré au build par un plugin Vite local :
  - précache de `/`, `/index.html`, manifest, icônes et assets hashés du bundle ;
  - stratégie cache-first pour les assets ;
  - stratégie network-first pour les requêtes `GET /api/` ;
  - fallback navigation vers `index.html` hors ligne ;
  - purge automatique des anciens caches applicatifs.
- Ajout de `registerServiceWorker()` côté front :
  - enregistrement uniquement en build production (`import.meta.env.PROD`) ;
  - pas d'effet en dev/test ;
  - erreurs d'enregistrement loggées sans bloquer l'app.
- Ajout de garde-fous CSS :
  - respect de `prefers-reduced-motion` ;
  - focus et bordures renforcés sous `prefers-contrast: more`.

## Tests

- `src/pwa/registerServiceWorker.test.ts` : 4 tests unitaires (désactivation, API absente, enregistrement, erreur).
- `env -u GOROOT make test` : 217 tests front passent, tests back `-race` passent.
- `env -u GOROOT make lint` : ESLint + Prettier + golangci-lint propres.
- `make typecheck` : TypeScript strict propre.
- `env -u GOROOT make build` : build front + back OK, `dist/sw.js` généré.
- `env -u GOROOT make test-e2e` : 28/28 tests E2E passent.
- Vérification production manuelle automatisée : `vite preview` + Chromium Playwright, activation du service worker, reload offline, titre `Sinogrammes` visible (`offline-ok`).

## Découvertes / surprises

- Le build actuel transforme ~9 600 modules et produit un `sw.js` d'environ 260 KB, car le glob Hanzi Writer embarque tous les JSON `hanzi-writer-data`. C'est acceptable pour ce premier socle offline, mais ce sera un axe clair d'optimisation du Lot 5.
- Le build signale toujours un gros chunk principal (~1,5 MB minifié). Même conclusion : pas bloquant pour le socle PWA, mais à traiter dans la phase performance.

## Décisions prises

- Pas de dépendance PWA externe pour l'instant : le service worker est généré par un petit plugin Vite local afin de maîtriser précisément la stratégie offline.
- Le service worker n'est actif qu'en production, pour éviter les effets de cache pendant le développement et les tests E2E existants.
- Le premier offline vise le shell applicatif et les assets de données déjà bundlés. La sync backend offline/conflict resolution reste hors de ce premier incrément.

## Reste à faire / prochaines étapes

- Optimiser le chargement Hanzi Writer pour ne plus embarquer l'intégralité de `hanzi-writer-data`.
- Ajouter des icônes PNG 192/512 si l'audit d'installabilité Boox/Chrome les exige.
- Lancer un audit Lighthouse sur build de production.
- Tester l'installation réelle sur Boox Air 5c et ordinateur.
