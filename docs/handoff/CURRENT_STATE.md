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

### Outillage doc (session du jour)

Cf. [`docs/journal/2026-05-28-carnet-html.md`](../journal/2026-05-28-carnet-html.md).

- ✅ **Carnet de bord HTML autonome** : `docs/index.html` généré par `make docs` (script `frontend/scripts/build-docs-index.ts`). Section État courant + RFC + Journal + Brief, navigation par ancres, mode sombre, mode print.
- ✅ **Discipline `CLAUDE.md`** : `make docs` est obligatoire après toute modif markdown sous `docs/` ou de `BRIEF.md`, dans le même commit.

### Correctif Canvas (session du jour, suite d'un retour d'usage)

Cf. [`docs/journal/2026-05-28-fix-canvas-feedback.md`](../journal/2026-05-28-fix-canvas-feedback.md).

- ✅ **Mount Hanzi Writer stable** : déps du useEffect réduites à `[hanzi, renderer]`, gating via `mountVersion`. Plus de perte du quiz quand on bascule outline/character.
- ✅ **Reset au changement de hanzi** : traits user et verdict vidés quand on sélectionne un autre caractère depuis le glossaire.
- ✅ **Feedback de verdict** : compteur i18n `N trait(s) validé(s)`, message explicite après chaque trait (accepté + N° / refusé + raison), bloc `aria-live="polite"`.
- ✅ **Distinction visuelle** : trait validé en transparent fin (laisse le trait propre Hanzi Writer dominer), trait refusé en gris épais dashed.
- ✅ Couverture : 6 tests nouveaux dont l'**assertion critique** que `mount` n'est pas rappelé sur toggle outline (la régression aurait été détectée immédiatement).

### Tests E2E Playwright (session du jour)

Cf. [RFC 0009](../rfc/0009-tests-e2e.md) et [`docs/journal/2026-05-28-playwright-e2e.md`](../journal/2026-05-28-playwright-e2e.md).

- ✅ Playwright installé, config Chromium seul, `webServer` qui démarre Vite automatiquement.
- ✅ 5 fichiers de scénarios (10 tests) : smoke, glossaire, navigation, langue, canvas. `make test-e2e` séparée de `make test`.
- ✅ **Bug race condition StrictMode corrigé** : la 1ʳᵉ `renderer.mount()` qui résolvait après son cleanup pouvait clobber le `_quiz` de la 2ᵉ. Symptôme : `validateStroke` levait au premier trait. Détecté par Playwright, invisible aux tests unitaires.
- ✅ `setPointerCapture/releasePointerCapture` wrappés en try/catch (résilience aux events synthétiques + edge cases prod).
- ✅ Signal `data-renderer-mounted` sur la couche d'input pour gate les tests.
- ✅ Discipline ajoutée à CLAUDE.md : `make test-e2e` recommandé avant push après changement de UI/flow.

## Vérifications croisées

- `make test` : **92 tests front passent**, 2 paquets back passent avec `-race`.
- `make test-e2e` : **10/10 tests E2E verts** (Chromium, ~10s).
- `make lint` : ESLint + Prettier propres, golangci-lint 0 issue.
- `make typecheck` : `tsc --noEmit` propre.
- `make docs` : `docs/index.html` à jour (9 RFC + 10 entrées de journal).

## Dernières décisions importantes

- 2026-05-28 : **recherche pinyin par défaut insensible aux diacritiques** dans le glossaire — l'utilisateur tape sur un clavier ASCII, on accepte la perte `nǚ → nu` pour la recherche tout en gardant l'affichage diacritique.
- 2026-05-28 : **carnet HTML versionné dans le repo** plutôt que généré-au-build. Diff bruyant accepté en échange de la facilité de consultation (double-click sur `docs/index.html`).
- 2026-05-28 : `docs/index.html` est régénéré dans le **même commit** que les markdown modifiés (pas dans un commit séparé).
- 2026-05-28 : **mount Hanzi Writer strictement lié à `[hanzi, renderer]`** ; toute autre dépendance qui s'ajouterait passe désormais par des effets de visibilité dédiés (gating via `mountVersion`).
- 2026-05-28 : **trait user validé estompé** (opacity 0.3, fin) pour laisser dominer le trait propre Hanzi Writer ; trait refusé bien visible (dashed gris épais).
- 2026-05-28 : **Playwright comme framework E2E** ([RFC 0009](../rfc/0009-tests-e2e.md)), Chromium seul, `frontend/e2e/`, cible `make test-e2e` séparée. MCP Playwright à installer côté machine utilisateur (instructions dans la RFC et le journal).
- 2026-05-28 : **`.then()` du mount async ne doit jamais appeler `renderer.unmount()` dans la branche cancelled** — le cleanup du useEffect s'en charge, et l'instance renderer est partagée entre les mounts StrictMode.

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
