# CURRENT_STATE — état courant du projet

> **Fichier toujours à jour.** À mettre à jour à la fin de chaque session de travail. Répond à la question : "où en est le projet, là, maintenant ?"

**Dernière mise à jour** : 2026-05-28

## Lot en cours

**Lot 2 — Glossaire** : 🟡 en cours. Liste, recherche et navigation vers le tracé en place. Reste les fiches détaillées.

## Ce qui est fait

### Lot 0 (clôturé)

Cf. [`docs/journal/2026-05-24-lot0-fondations.md`](../journal/2026-05-24-lot0-fondations.md). Documentation initiale, structure du monorepo, schéma de données v1 + fixture, backend Go avec `/health` en TDD, frontend Vite/React/TS strict + Tailwind + Vitest + i18n FR/EN, ports hexagonaux, orchestrateur de migrations, Makefile racine.

### Lot 1 (clôturé) — Canvas et validation de tracé

Cf. journal Lot 1 : sourcing HSK 1, `BundledDataSource`, `HanziWriterRenderer`, capture Pointer Events, grilles calligraphiques et modes d'affichage. L'app permet de choisir un caractère, le tracer au stylet, valider l'ordre des traits.

### Lot 2 (en cours) — Glossaire

Cf. [`docs/journal/2026-05-28-lot2-glossaire-recherche.md`](../journal/2026-05-28-lot2-glossaire-recherche.md).

- ✅ **Composant `Glossary`** (`src/features/glossary/`) : liste HSK 1 navigable, deux onglets `caractères` / `mots`, compteurs, état `loading` pendant le parse Zod.
- ✅ **Recherche unique** sur hanzi + pinyin (diacritique et ASCII) + traductions toutes langues confondues.
- ✅ **Helper pinyin** (`src/lib/pinyin.ts`) : `pinyinToString` (diacritique) + `pinyinToAscii` (insensible aux tons et au tréma).
- ✅ **Routing app** glossary ↔ practice : `App.tsx` orchestre via état local, bouton retour `←`, mémoïsation du `HanziWriterRenderer`.
- ✅ **i18n FR/EN** : nouvelle section `glossary` (title, search_placeholder, characters, words, no_results, practice).
- ⏳ Fiches détaillées caractère/mot (étape 4 du Lot 2, à faire).

### Outillage doc (cette session)

Cf. [`docs/journal/2026-05-28-carnet-html.md`](../journal/2026-05-28-carnet-html.md).

- ✅ **Carnet de bord HTML autonome** : `docs/index.html` généré par `make docs` (script `frontend/scripts/build-docs-index.ts`). Section État courant + RFC + Journal + Brief, navigation par ancres, mode sombre, mode print.
- ✅ **Discipline `CLAUDE.md`** : `make docs` est obligatoire après toute modif markdown sous `docs/` ou de `BRIEF.md`, dans le même commit.

## Vérifications croisées

- `make test` : **86 tests front passent**, 2 paquets back passent avec `-race`.
- `make lint` : ESLint + Prettier propres, golangci-lint 0 issue.
- `make typecheck` : `tsc --noEmit` propre.
- `make docs` : `docs/index.html` à jour (8 RFC + 8 entrées de journal après les deux nouvelles d'aujourd'hui).

## Dernières décisions importantes

- 2026-05-28 : **recherche pinyin par défaut insensible aux diacritiques** dans le glossaire — l'utilisateur tape sur un clavier ASCII, on accepte la perte `nǚ → nu` pour la recherche tout en gardant l'affichage diacritique.
- 2026-05-28 : **carnet HTML versionné dans le repo** plutôt que généré-au-build. Diff bruyant accepté en échange de la facilité de consultation (double-click sur `docs/index.html`).
- 2026-05-28 : `docs/index.html` est régénéré dans le **même commit** que les markdown modifiés (pas dans un commit séparé).

## Bloquants connus

Aucun.

## Prochaines étapes (Lot 2)

1. ✅ Liste HSK 1.
2. ✅ Recherche.
3. ✅ Navigation glossary → canvas.
4. **Fiches détaillées** : afficher pinyin complet, toutes les traductions, exemples si disponibles, character_refs cliquables (mot → ses caractères constitutifs). À arbitrer : modale, page dédiée, ou panneau latéral.

Pistes pour plus tard : tri/filtre par radical, par tag, par fréquence ; statistiques d'apprentissage côté liste (% des caractères vus / pratiqués).

## Liens utiles

- Brief figé : [`../../BRIEF.md`](../../BRIEF.md)
- Carnet HTML : [`../index.html`](../index.html)
- Index des RFC : [`../rfc/README.md`](../rfc/README.md)
- Index du journal : [`../journal/README.md`](../journal/README.md)
- Provenance des sources vendorées : [`../../shared/data/sources/_provenance.json`](../../shared/data/sources/_provenance.json)
