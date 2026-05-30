# CURRENT_STATE — état courant du projet

> **Fichier toujours à jour.** À mettre à jour à la fin de chaque session de travail. Répond à la question : "où en est le projet, là, maintenant ?"

**Dernière mise à jour** : 2026-05-30 (session 2)

## Lot en cours

**Lot 2 — Glossaire** : ✅ clôturé. Liste, recherche, navigation vers le tracé et fiches détaillées en place. Prochain lot à arbitrer.

## Ce qui est fait

### Lot 0 (clôturé)

Cf. [`docs/journal/2026-05-24-lot0-fondations.md`](../journal/2026-05-24-lot0-fondations.md). Documentation initiale, structure du monorepo, schéma de données v1 + fixture, backend Go avec `/health` en TDD, frontend Vite/React/TS strict + Tailwind + Vitest + i18n FR/EN, ports hexagonaux, orchestrateur de migrations, Makefile racine.

### Lot 1 (clôturé) — Canvas et validation de tracé

Cf. journal Lot 1 : sourcing HSK 1, `BundledDataSource`, `HanziWriterRenderer`, capture Pointer Events, grilles calligraphiques et modes d'affichage. L'app permet de choisir un caractère, le tracer au stylet, valider l'ordre des traits.

### Lot 2 (clôturé) — Glossaire

Cf. [`docs/journal/2026-05-28-lot2-glossaire-recherche.md`](../journal/2026-05-28-lot2-glossaire-recherche.md) et [`docs/journal/2026-05-30-fiches-detaillees-glossaire.md`](../journal/2026-05-30-fiches-detaillees-glossaire.md).

- ✅ **Composant `Glossary`** (`src/features/glossary/`) : liste HSK 1 navigable, deux onglets `caractères` / `mots`, compteurs, état `loading` pendant le parse Zod.
- ✅ **Recherche unique** sur hanzi + pinyin (diacritique et ASCII) + traductions toutes langues confondues.
- ✅ **Helper pinyin** (`src/lib/pinyin.ts`) : `pinyinToString` (diacritique) + `pinyinToAscii` (insensible aux tons et au tréma).
- ✅ **Routing app** glossary ↔ detail ↔ practice : `App.tsx` orchestre via état local et `detailEntryId`, back-stack à 3 niveaux (depuis practice on revient à la fiche si on est passé par elle, sinon directement au glossaire).
- ✅ **Composant `EntryDetail`** (`src/features/glossary/EntryDetail.tsx`) : vue dédiée plein écran, header hanzi/pinyin, infos (HSK, traits, radicaux, fréquence), sens groupés par langue avec langue courante d'abord, cross-refs cliquables (caractère → mots qui le contiennent / mot → caractères constitutifs), section examples conditionnelle.
- ✅ **Bouton "Détails" séparé de "Tracer"** sur chaque carte du glossaire (cibles stylet larges et non ambiguës).
- ✅ **i18n FR/EN** : nouvelle clé `glossary.details` + sous-objet `glossary.detail.*` (back, practice, facts, hsk, stroke_count, radicals, frequency, meanings, no_translations, appears_in_words, constituent_characters, examples, not_found).

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

### Verrou E2E StrictMode (session du jour)

Cf. [`docs/journal/2026-05-30-fiches-detaillees-glossaire.md`](../journal/2026-05-30-fiches-detaillees-glossaire.md).

- ✅ `e2e/strict-mode-regression.spec.ts` (2 scénarios) : toggle outline 3× puis tracé d'un trait (assert verdict visible + aucun `pageerror`/`console.error` lié à Hanzi Writer) ; stress test 10 toggles consécutifs.
- ✅ Fiche `entry-detail.spec.ts` (3 scénarios) : navigation glossary → detail → practice → ← → detail → ← → glossary, cross-ref caractère → mot lié, cross-ref mot → caractère constitutif.

### Canvas — détection trait répété + Annuler / Tout effacer (session du jour)

Cf. [`docs/journal/2026-05-30-canvas-undo-reset-repeat-detection.md`](../journal/2026-05-30-canvas-undo-reset-repeat-detection.md).

- ✅ **Détection géométrique du trait répété** dans `Canvas` : helper `lib/strokeSimilarity.ts` (comparaison des endpoints, tolérance 15 % de la taille du canvas). Si un trait refusé matche un trait précédemment validé, on requalifie le verdict en `repeated_stroke` et on ne pollue pas le SVG.
- ✅ **Boutons `Annuler` et `Tout effacer`** sous le compteur. Désactivés quand il n'y a rien à défaire. `Tout effacer` appelle `renderer.reset()` ; `Annuler` ne touche qu'à l'affichage (état quiz Hanzi Writer inchangé).
- ✅ Port `CharacterRenderer` étendu avec `reason: 'repeated_stroke'` (valeur synthétisée par l'UI, jamais produite par l'adapter).
- ✅ Couverture : 9 tests sur le helper, 7 tests sur Canvas, 3 scénarios E2E (`e2e/canvas-controls.spec.ts`).

## Vérifications croisées

- `make test` : **116 tests front passent**, 2 paquets back passent avec `-race`.
- `make test-e2e` : **18/18 tests E2E verts** (Chromium, ~3,6 s).
- `make lint` : ESLint + Prettier propres, golangci-lint 0 issue.
- `make typecheck` : `tsc --noEmit` propre.
- `make docs` : `docs/index.html` à jour (9 RFC + 12 entrées de journal).

## Dernières décisions importantes

- 2026-05-30 (s2) : **détection trait répété côté UI**, pas côté port. `Canvas` synthétise un `reason: 'repeated_stroke'` quand un trait refusé matche géométriquement un trait accepté. L'adapter Hanzi Writer reste agnostique.
- 2026-05-30 (s2) : **Annuler n'efface que l'affichage**, pas l'état du quiz Hanzi Writer. Pour défaire l'avancement quiz, il faut Tout effacer.
- 2026-05-30 (s2) : **trait inversé ≠ trait répété**. La comparaison des endpoints est ordonnée (début↔début, fin↔fin), donc tracer en sens inverse reste signalé `wrong_direction` par Hanzi Writer.
- 2026-05-30 : **fiche détaillée = vue dédiée plein écran** (pas modale ni panneau latéral). Cohérent avec le pattern existant glossary ↔ practice, zéro transparence pour l'e-ink, zéro animation latérale.
- 2026-05-30 : **deux boutons séparés "Détails" + "Tracer"** sur chaque carte du glossaire — plus explicite que clic-carte avec un seul bouton ; cibles stylet plus larges et sans ambiguïté.
- 2026-05-30 : **back-stack à 3 niveaux** (glossary → detail → practice). Le retour depuis practice ramène à la fiche si on est passé par elle, sinon directement au glossaire.
- 2026-05-30 : **verrou E2E explicite du bug StrictMode** via `pageerror` + filtre `console.error` (quiz/hanzi/TypeError). Filet de sécurité durable même si quelqu'un refactorise le mount sans le savoir.
- 2026-05-28 : **recherche pinyin par défaut insensible aux diacritiques** dans le glossaire — l'utilisateur tape sur un clavier ASCII, on accepte la perte `nǚ → nu` pour la recherche tout en gardant l'affichage diacritique.
- 2026-05-28 : **carnet HTML versionné dans le repo** plutôt que généré-au-build. Diff bruyant accepté en échange de la facilité de consultation (double-click sur `docs/index.html`).
- 2026-05-28 : `docs/index.html` est régénéré dans le **même commit** que les markdown modifiés (pas dans un commit séparé).
- 2026-05-28 : **mount Hanzi Writer strictement lié à `[hanzi, renderer]`** ; toute autre dépendance qui s'ajouterait passe désormais par des effets de visibilité dédiés (gating via `mountVersion`).
- 2026-05-28 : **trait user validé estompé** (opacity 0.3, fin) pour laisser dominer le trait propre Hanzi Writer ; trait refusé bien visible (dashed gris épais).
- 2026-05-28 : **Playwright comme framework E2E** ([RFC 0009](../rfc/0009-tests-e2e.md)), Chromium seul, `frontend/e2e/`, cible `make test-e2e` séparée. MCP Playwright à installer côté machine utilisateur (instructions dans la RFC et le journal).
- 2026-05-28 : **`.then()` du mount async ne doit jamais appeler `renderer.unmount()` dans la branche cancelled** — le cleanup du useEffect s'en charge, et l'instance renderer est partagée entre les mounts StrictMode.

## Bloquants connus

Aucun.

## Prochaines étapes (Lot 2 clôturé)

1. ✅ Liste HSK 1.
2. ✅ Recherche.
3. ✅ Navigation glossary → canvas.
4. ✅ Fiches détaillées (vue dédiée, cross-refs cliquables, sens par langue).

**Le Lot 2 est terminé.** Prochaines orientations possibles (à arbitrer dans une RFC dédiée quand on ouvre le Lot 3) :

- Tri/filtre du glossaire : par radical, par tag, par fréquence d'apparition.
- Statistiques d'apprentissage côté liste : % de caractères vus / pratiqués / réussis du premier coup.
- Persistance des sessions de tracé (backend `progress` ?), pour alimenter les stats ci-dessus.
- Mode révision (decks programmés, SRS basique).

## Liens utiles

- Brief figé : [`../../BRIEF.md`](../../BRIEF.md)
- Carnet HTML : [`../index.html`](../index.html)
- Index des RFC : [`../rfc/README.md`](../rfc/README.md)
- Index du journal : [`../journal/README.md`](../journal/README.md)
- Provenance des sources vendorées : [`../../shared/data/sources/_provenance.json`](../../shared/data/sources/_provenance.json)
