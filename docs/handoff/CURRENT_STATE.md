# CURRENT_STATE — état courant du projet

> **Fichier toujours à jour.** À mettre à jour à la fin de chaque session de travail. Répond à la question : "où en est le projet, là, maintenant ?"

**Dernière mise à jour** : 2026-05-24

## Lot en cours

**Lot 2 — Glossaire** : ⚪️ à démarrer. Navigation et consultation de la liste HSK 1.

## Ce qui est fait

### Lot 0 (clôturé)

Cf. [`docs/journal/2026-05-24-lot0-fondations.md`](../journal/2026-05-24-lot0-fondations.md). Documentation initiale, structure du monorepo, schéma de données v1 + fixture, backend Go avec `/health` en TDD, frontend Vite/React/TS strict + Tailwind + Vitest + i18n FR/EN, ports hexagonaux, orchestrateur de migrations, Makefile racine.

### Lot 1 (clôturé) — Canvas et validation de tracé

Cf. [`docs/journal/2026-05-24-hanzi-writer-renderer.md`](../journal/2026-05-24-hanzi-writer-renderer.md) et [`docs/journal/2026-05-24-capture-pointer-events.md`](../journal/2026-05-24-capture-pointer-events.md).

- ✅ **Sourcing HSK 1** : pipeline de données validé via Zod, sources vendorées.
- ✅ **`BundledDataSource`** : adapter pour accès aux données statiques.
- ✅ **`HanziWriterRenderer`** : adapter pour le rendu et la validation via Hanzi Writer.
- ✅ **Capture stylet via Pointer Events** : composant `<Canvas />` complet.
- ✅ **Grilles d'aide** : composant `<CharacterGrid />` (Tian, Mi, Hui).
- ✅ **Modes d'affichage** : contrôle de la visibilité modèle/outline.
- ✅ **UX e-ink** : animations désactivées, contraste maximal, redraws optimisés.
- ✅ **Intégration** : `App.tsx` propose une démo fonctionnelle sur les 10 premiers caractères.

### Vérifications croisées

- `make test` : **76 tests front** passent, 2 paquets back passent avec `-race`.
- `make lint` : ESLint + Prettier clean, golangci-lint 0 issue.
- `make typecheck` : `tsc --noEmit` clean.
- `make build` : bundle front + binaire back OK.

## Dernières décisions importantes

- 2026-05-24 : sourcing acté ([RFC 0008](../rfc/0008-sourcing-hsk1.md)).
- 2026-05-24 : validation de l'intégration `HanziWriterRenderer` dans `Canvas` avec gestion des Pointer Events.
- 2026-05-24 : ajout des grilles calligraphiques SVG pour l'aide au tracé.

## Bloquants connus

Aucun.

## Prochaines étapes (Lot 2)

1. **Liste HSK 1** : affichage de la liste complète des caractères et mots.
2. **Recherche** : filtrage par hanzi, pinyin ou définition.
3. **Navigation** : passage de la liste au canvas de tracé.
4. **Fiches détaillées** : affichage pinyin, définitions, exemples si disponibles.

## Liens utiles

- Brief figé : [`../../BRIEF.md`](../../BRIEF.md)
- Index des RFC : [`../rfc/README.md`](../rfc/README.md)
- Index du journal : [`../journal/README.md`](../journal/README.md)
- Provenance des sources vendorées : [`../../shared/data/sources/_provenance.json`](../../shared/data/sources/_provenance.json)
