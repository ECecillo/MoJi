# CURRENT_STATE — état courant du projet

> **Fichier toujours à jour.** À mettre à jour à la fin de chaque session de travail. Répond à la question : "où en est le projet, là, maintenant ?"

**Dernière mise à jour** : 2026-05-24

## Lot en cours

**Lot 1 — Canvas et validation de tracé** : 🟡 en cours. Sourcing HSK 1, `BundledDataSource` et `HanziWriterRenderer` posés.

## Ce qui est fait

### Lot 0 (clôturé)

Cf. [`docs/journal/2026-05-24-lot0-fondations.md`](../journal/2026-05-24-lot0-fondations.md). Documentation initiale, structure du monorepo, schéma de données v1 + fixture, backend Go avec `/health` en TDD, frontend Vite/React/TS strict + Tailwind + Vitest + i18n FR/EN, ports hexagonaux, orchestrateur de migrations, Makefile racine, six commits thématiques sur `main`.

### Session 2026-05-24 — sourcing HSK 1

- ✅ [RFC 0008 — Sourcing des données HSK 3.0 niveau 1](../rfc/0008-sourcing-hsk1.md) acceptée.
- ✅ Sources upstream **vendorées** dans `shared/data/sources/`, pinnées par SHA :
  - `drkameleon-hsk30-l1.json` (482 KB) — vocabulaire HSK 3.0 niveau 1 verbatim (MIT).
  - `makemeahanzi-hsk1-meta.jsonl` (~45 KB) — sous-ensemble dérivé (stroke_count, radical, decomposition, definition).
  - `_provenance.json` — URLs, SHA upstream, hashs SHA-256, date.
- ✅ Pipeline TS `frontend/scripts/build-hsk1-data.ts` : lit les sources vendorées (offline), transforme au format schéma v1, **valide via Zod**, écrit `frontend/src/data/hsk1.generated.json` (471 KB, 300 caractères + 506 mots + 2 decks).
- ✅ Pipeline TS `frontend/scripts/vendor-sources.ts` pour rafraîchir le snapshot (rare, réseau).
- ✅ **18 nouveaux tests Vitest** sur l'intégrité de la sortie (conformité schéma, comptes, intégrité référentielle, contraintes métier, spot-check sur 你).
- ✅ Cibles Makefile `make vendor-sources` / `make build-data`. Scripts npm correspondants.
- ✅ Entrée de journal `2026-05-24-sourcing-hsk1.md`.

### Lot 1 step 1 — `BundledDataSource` (TDD)

- ✅ Nouveau dossier `src/adapters/data/` (cohérent avec `renderer/`, `storage/`, `api/`).
- ✅ `BundledDataSource` implémente le port `DataSource` : valide via Zod à la première lecture, met en cache, lève `BundledDataSourceError` avec un message structuré (chemin + raison Zod). Blob injecté via constructeur — pas d'import en dur → testable.
- ✅ 11 nouveaux tests Vitest : validation sur la fixture partagée (2 chars + 1 mot + 1 deck), idempotence du cache, rejet des données invalides (champ inconnu, schema_version v2, format SemVer cassé), pas de cache d'erreur, intégration sur la sortie `hsk1.generated.json` (300 chars + ≥500 mots + 2 decks).

### Lot 1 step 2 — `HanziWriterRenderer`

- ✅ Dépendances npm ajoutées : `hanzi-writer@3.7.3` + `hanzi-writer-data@2.0.1`.
- ✅ `HanziWriterRenderer` implémente le port `CharacterRenderer` dans `src/adapters/renderer/`.
- ✅ Données de tracé chargées depuis `hanzi-writer-data` via `import.meta.glob`, sans CDN runtime.
- ✅ Render target SVG custom : neutralise les listeners `mousedown` / `touch*` internes de Hanzi Writer pour conserver la règle projet "Pointer Events uniquement". Le futur composant canvas capturera les Pointer Events et appellera `validateStroke()`.
- ✅ Options par défaut e-ink-friendly : SVG, noir/gris, modèle masqué par défaut, timings d'animation à zéro, pas de hint/flash automatique.
- ✅ 8 nouveaux tests Vitest/jsdom : câblage options, loader injecté, no mouse/touch listeners, validation acceptée, wrong direction, too short, reset/unmount, chargement bundlé de `你`.

### Vérifications croisées

- `env -u GOROOT make test` : **61 tests front** passent, 2 paquets back passent avec `-race`.
- `env -u GOROOT make lint` : ESLint + Prettier clean, golangci-lint 0 issue.
- `make typecheck` : `tsc --noEmit` clean.
- `env -u GOROOT make build` : bundle front + binaire back OK.
- Note environnement : le shell local peut encore exposer un ancien `GOROOT` Homebrew. Préférer `env -u GOROOT ...` tant que cette variable n'est pas nettoyée dans l'environnement utilisateur.
- `make build-front` / `npm run build` : le bundle de `App.tsx` reste autour de 204 KB JS / 65 KB gzip car `HanziWriterRenderer` n'est pas encore câblé dans l'app. Le chunk Hanzi Writer arrivera quand la feature canvas importera l'adapter.

## Dernières décisions importantes

- 2026-05-24 : sourcing acté ([RFC 0008](../rfc/0008-sourcing-hsk1.md)). drkameleon + makemeahanzi, vendoring pinned, pipeline TS frontend.
- 2026-05-24 : **你好 n'est PAS dans HSK 3.0 niveau 1** (vérifié sur drkameleon, conforme à la spec Hanban 2021). Décision : on respecte la liste officielle ; une éventuelle liste de phrases d'usage hors HSK est à traiter séparément.

## Bloquants connus

Aucun.

## Prochaines étapes (Lot 1)

1. ✅ **`BundledDataSource`** (adapter du port `DataSource`).
2. ✅ **Intégration de Hanzi Writer** dans l'adapter `HanziWriterRenderer` (port `CharacterRenderer`).
3. **Capture stylet via Pointer Events** : composant `<Canvas />` dans `features/canvas/`. Gestion pression/inclinaison, transmission des points à `CharacterRenderer.validateStroke()`.
4. **Grilles d'aide** : Tian Zi Ge, Mi Zi Ge, Hui Zi Ge en composants `ui/`.
5. **Modes d'affichage** : modèle semi-transparent vs caché, basculable.
6. **UX e-ink** : noir/blanc strict, pas d'animation gratuite, redraw minimisé.
7. À surveiller lors du câblage canvas : vérifier l'impact bundle/chunks du loader `hanzi-writer-data` et restreindre au sous-ensemble HSK 1 si nécessaire.

## Liens utiles

- Brief figé : [`../../BRIEF.md`](../../BRIEF.md)
- Index des RFC : [`../rfc/README.md`](../rfc/README.md)
- Index du journal : [`../journal/README.md`](../journal/README.md)
- Dernière entrée de journal : [`../journal/2026-05-24-hanzi-writer-renderer.md`](../journal/2026-05-24-hanzi-writer-renderer.md)
- Provenance des sources vendorées : [`../../shared/data/sources/_provenance.json`](../../shared/data/sources/_provenance.json)
