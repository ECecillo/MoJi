# 2026-05-24 — Adapter Hanzi Writer Renderer

## Objectif de la session

Poursuivre le Lot 1 après `BundledDataSource` : installer Hanzi Writer, poser l'adapter `HanziWriterRenderer` derrière le port `CharacterRenderer`, et vérifier qu'il reste compatible avec les contraintes offline-first et Pointer Events.

## Ce qui a été fait

- Dépendances npm ajoutées côté front :
  - `hanzi-writer@3.7.3`
  - `hanzi-writer-data@2.0.1`
- `frontend/src/adapters/renderer/HanziWriterRenderer.ts` ajouté :
  - implémente le port `CharacterRenderer`;
  - monte Hanzi Writer en SVG;
  - charge les données de tracé depuis `hanzi-writer-data` via `import.meta.glob`, sans CDN runtime;
  - expose un loader injectable pour les tests;
  - lance le mode quiz Hanzi Writer et traduit les callbacks en `StrokeValidationResult`;
  - désactive les timings d'animation par défaut pour rester e-ink-friendly;
  - fournit un render target SVG custom qui neutralise les listeners `mousedown` / `touch*` internes de Hanzi Writer. L'entrée utilisateur sera pilotée par le futur composant canvas via Pointer Events.
- `frontend/src/vite-env.d.ts` ajouté pour typer `import.meta.glob`.
- `frontend/src/adapters/renderer/HanziWriterRenderer.test.ts` ajouté :
  - 8 tests Vitest/jsdom;
  - vérification du câblage des options e-ink;
  - loader de données injecté;
  - neutralisation des listeners mouse/touch;
  - validation acceptée;
  - mapping `isBackwards → wrong_direction`;
  - rejet d'un trait trop court;
  - `reset()` et `unmount()`;
  - smoke test sur le chargement bundlé de `你` depuis `hanzi-writer-data`.

## Découvertes / surprises

- Hanzi Writer attache par défaut des listeners `mousedown`, `mousemove`, `touchstart`, `touchmove`, `mouseup`, `touchend`. Cela ne respecte pas la règle projet "Pointer Events uniquement".
- Solution retenue : ne pas laisser Hanzi Writer capturer directement les entrées. L'adapter fournit un render target custom dont les hooks d'entrée sont no-op, puis alimente le quiz via `validateStroke()` avec les points capturés ailleurs.
- Le loader par défaut de Hanzi Writer utilise le CDN jsDelivr. Il est donc explicitement remplacé par un loader bundlé basé sur `hanzi-writer-data`.
- L'environnement shell local pointe parfois vers un ancien `GOROOT` Homebrew. Les commandes Go passent avec `unset GOROOT`.

## Décisions prises

Aucune nouvelle RFC. Les choix appliquent les RFC existantes :

- RFC 0002 : Hanzi Writer derrière abstraction.
- RFC 0003 : adapter concret dans `src/adapters/renderer/`.
- RFC 0006 : offline-first, pas de CDN runtime.
- RFC 0007 : Lot 1 uniquement.

## Vérifications

- `env -u GOROOT make test` : 61 tests front + tests back `-race` verts.
- `env -u GOROOT make lint` : ESLint + Prettier + golangci-lint verts.
- `make typecheck` : vert.
- `env -u GOROOT make build` : vert.

## Reste à faire / prochaines étapes

- Intégrer la capture stylet via Pointer Events dans `features/canvas/`.
- Construire le composant `<Canvas />` qui capture pression/inclinaison et appelle `CharacterRenderer.validateStroke()`.
- Ajouter les grilles Tian Zi Ge, Mi Zi Ge, Hui Zi Ge.
- Ajouter les modes modèle semi-transparent / caché.
- Câbler ensuite `BundledDataSource` + `HanziWriterRenderer` dans une première expérience utilisable.
