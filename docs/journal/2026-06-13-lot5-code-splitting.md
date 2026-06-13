# 2026-06-13 — Lot 5 : code-splitting du chunk principal

## Objectif de la session

Suite directe de l'optimisation des assets Hanzi Writer : le chunk principal JS
restait à ~573 KB. Le réduire par code-splitting pour accélérer le démarrage du
shell applicatif sur la Boox.

## Ce qui a été fait

- **Données de référence en chunk paresseux** (`hsk1.generated.json`, ~480 KB brut,
  226 KB minifié). Nouveau loader mémoïsé `adapters/data/bundledReferenceData.ts`
  qui importe le JSON en dynamique et expose une **instance `BundledDataSource`
  partagée** (un seul parse Zod au lieu de trois). `App`, `Glossary` et `EntryDetail`
  ne l'importent plus statiquement : ils consomment `loadBundledDataSource()` dans
  leur effet de chargement existant (qui était déjà asynchrone, avec état de
  chargement). Le shell démarre donc sans attendre les 226 KB de données.

## Gain mesuré (build production)

| Chunk                          | Avant       | Après        |
|--------------------------------|-------------|--------------|
| `index` (shell : React, i18n, zod, UI) | ~573 KB | **348 KB** (gzip 103 KB) |
| `hsk1.generated` (données)     | —           | 226 KB (gzip 46), chargé en parallèle dès le glossaire |
| `hsk1-stroke-data` (tracés)    | 618 KB      | inchangé (chargé au 1er tracé) |

Soit **−39 %** sur le chunk principal. Les données restent précachées par le
service worker (offline préservé) ; le chunk se charge en parallèle pendant que
React boote, masqué par l'état de chargement déjà présent dans le glossaire.

## Piste abandonnée : lazy-load de `hanzi-writer`

Tentative de sortir aussi `hanzi-writer` (~37 KB) du chunk principal via import
dynamique dans `HanziWriterRenderer.mount()`. **Abandonnée après bisection E2E** :

- Avec `hanzi-writer` chargé en différé, les tests canvas (`strict-mode-regression`,
  `canvas-controls`) échouaient de façon déterministe — le SVG injecté par Hanzi
  Writer interceptait les clics sur les boutons (Outline, etc.) après un montage
  retardé. Symptôme d'un vrai problème d'interaction pendant le montage différé,
  pas seulement de timing de test.
- Bisection : données eager + hanzi-writer lazy → échec ; hanzi-writer eager +
  données lazy → 28/28 verts. La cause isolée est bien le lazy-load de hanzi-writer.
- **Arbitrage** : 37 KB (gzip 11 KB) ne justifient pas de fragiliser le canvas, cœur
  du produit, ni de casser un verrou de non-régression. `hanzi-writer` reste donc
  dans le chunk principal, chargé tôt.

## Vérifications

Toutes sous le Node épinglé (`mise exec node@24.15.0 -- …`) :

- `make test` : 220 tests front + backend `-race` OK.
- `make lint` : ESLint + Prettier + golangci-lint, 0 issue.
- `make typecheck` : `tsc --noEmit` propre.
- `make build` : chunk principal 348 KB, `hsk1.generated` 226 KB séparé.
- `make test-e2e` : 28/28 Chromium (~9 s).

## Décisions prises

- **Données de référence chargées en dynamique, instance `BundledDataSource`
  partagée.** Le shell ne dépend plus de la taille des données pour son premier
  rendu ; offline préservé via le précache SW.
- **`hanzi-writer` reste eager.** Le code-splitting de la bibliothèque casse
  l'interaction canvas en production (SVG monté en différé qui capte les clics) ;
  le gain (37 KB) ne le justifie pas.

## Reste à faire / prochaines étapes (Lot 5)

- Le chunk principal (348 KB) est désormais surtout du vendor incompressible
  (React, react-i18next, zod) nécessaire au premier rendu. Aller plus loin
  (lazy-load des vues Dashboard/Detail via `React.lazy`) donnerait des gains
  marginaux pour une complexité Suspense réelle — non prioritaire.
- Icônes PNG 192/512 si l'audit Boox/Chrome les exige.
- Audit Lighthouse sur build de production.
- Test d'installation réel sur Boox Air 5c (nécessite le matériel).
