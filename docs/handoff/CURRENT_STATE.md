# CURRENT_STATE — état courant du projet

> **Fichier toujours à jour.** À mettre à jour à la fin de chaque session de travail. Répond à la question : "où en est le projet, là, maintenant ?"

**Dernière mise à jour** : 2026-05-24

## Lot en cours

**Lot 1 — Canvas et validation de tracé** : 🟡 démarré. Première brique posée (sourcing et bundling des données HSK 1).

## Ce qui est fait

### Lot 0 (clôturé)
Cf. [`docs/journal/2026-05-24-lot0-fondations.md`](../journal/2026-05-24-lot0-fondations.md). Documentation initiale, structure du monorepo, schéma de données v1 + fixture, backend Go avec `/health` en TDD, frontend Vite/React/TS strict + Tailwind + Vitest + i18n FR/EN, ports hexagonaux, orchestrateur de migrations, Makefile racine, six commits thématiques sur `main`.

### Session 2026-05-24 (cette session) — sourcing HSK 1
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

### Vérifications croisées
- `make test` : **42 tests front passent** (24 + 18 nouveaux), 2 paquets back passent avec `-race`.
- `make lint` : ESLint + Prettier clean, golangci-lint 0 issue.
- `make typecheck` : `tsc --noEmit` clean.
- `make build-front` : front bundle inchangé (204 KB JS / 65 KB gzip). Le `hsk1.generated.json` n'est pas encore consommé par le bundle (en attente de `BundledDataSource` au prochain pas).

## Dernières décisions importantes

- 2026-05-24 : sourcing acté ([RFC 0008](../rfc/0008-sourcing-hsk1.md)). drkameleon + makemeahanzi, vendoring pinned, pipeline TS frontend.
- 2026-05-24 : **你好 n'est PAS dans HSK 3.0 niveau 1** (vérifié sur drkameleon, conforme à la spec Hanban 2021). Décision : on respecte la liste officielle ; une éventuelle liste de phrases d'usage hors HSK est à traiter séparément.

## Bloquants connus

Aucun.

## Prochaines étapes (Lot 1)

1. **`BundledDataSource`** (adapter du port `DataSource`) : importe `hsk1.generated.json`, expose `load()`, `characters()`, `words()`, `decks()`. Tests d'intégration.
2. **Intégration de Hanzi Writer** dans l'adapter `HanziWriterRenderer` (port `CharacterRenderer`). Dépendance npm à installer. Tests à structurer (mock du DOM via jsdom).
3. **Capture stylet via Pointer Events** : composant `<Canvas />` dans `features/canvas/`. Gestion pression/inclinaison.
4. **Grilles d'aide** : Tian Zi Ge, Mi Zi Ge, Hui Zi Ge en composants `ui/`.
5. **Modes d'affichage** : modèle semi-transparent vs caché, basculable.
6. **UX e-ink** : noir/blanc strict, pas d'animation gratuite, redraw minimisé.
7. À la fin du Lot 1 : sourcer les données pour Hanzi Writer en mode bundlé (la lib charge ses propres données depuis `hanzi-writer-data` au runtime).

## Liens utiles

- Brief figé : [`../../BRIEF.md`](../../BRIEF.md)
- Index des RFC : [`../rfc/README.md`](../rfc/README.md)
- Index du journal : [`../journal/README.md`](../journal/README.md)
- Dernière entrée de journal : [`../journal/2026-05-24-sourcing-hsk1.md`](../journal/2026-05-24-sourcing-hsk1.md)
- Provenance des sources vendorées : [`../../shared/data/sources/_provenance.json`](../../shared/data/sources/_provenance.json)
