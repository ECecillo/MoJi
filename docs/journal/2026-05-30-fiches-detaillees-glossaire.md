# 2026-05-30 — Fiches détaillées du glossaire + verrou E2E StrictMode

## Objectif de la session

Boucler l'étape 4 du Lot 2 : depuis le glossaire, ouvrir une **fiche détaillée** pour un caractère ou un mot (pinyin complet, infos clés, sens groupés par langue, cross-refs cliquables). Et au passage, **verrouiller par un scénario E2E dédié** la non-régression du bug race condition StrictMode corrigé le 28/05 (toggle outline + tracé).

## Décisions de design

- **Vue dédiée**, pas modale ni panneau latéral. Cohérent avec le pattern existant (`glossary ↔ practice`), zéro transparence donc compatible e-ink Boox, anim nulle. Ajout d'un troisième état dans le `View` de `App.tsx` : `'glossary' | 'detail' | 'practice'`.
- **Bouton "Détails" séparé** de "Tracer" sur chaque carte du glossaire. Plus explicite ; deux cibles de stylet larges, faciles à toucher sans ambiguïté.
- **Back-stack à trois niveaux** : depuis practice, le ← ramène à la fiche détail si on est arrivé par là, ou directement au glossaire si on a cliqué "Tracer" directement dans la liste.
- Sens **groupés par langue**, langue courante d'abord. Évite la confusion FR/EN dans une seule liste à plat.
- Cross-refs **cliquables** :
  - sur la fiche d'un caractère → liste des mots où il apparaît (filtre sur `character_refs`).
  - sur la fiche d'un mot → caractères constitutifs sous forme de pavés (cliquer ouvre la fiche du caractère).
- Section **examples** rendue uniquement si non vide (la majorité des entrées HSK 1 ont `examples: []` dans le bundle actuel ; pas de garbage UI si vide).

## Ce qui a été fait

### `src/features/glossary/EntryDetail.tsx`
- Composant `EntryDetail` paramétré par `entryId` (`char_XXXX` ou `word_XXXX`). Charge les données via `BundledDataSource` (même cache que `Glossary`, pas de double parse).
- Discrimination de l'entry via préfixe d'`id` puis `find` dans `characters` ou `words`.
- Sections : header (hanzi + pinyin), infos (HSK, traits, radicaux, fréquence), sens groupés par langue, mots associés (caractère) ou caractères constitutifs (mot), exemples conditionnels.
- Tous les éléments cliquables ont un `data-testid` (`detail-hanzi`, `detail-pinyin`, `detail-back`, `detail-practice`, `related-word`, `constituent-character`, `entry-detail`).
- Fallback `Entrée introuvable` si l'`entryId` ne matche aucun caractère ni mot.

### `src/features/glossary/Glossary.tsx`
- Ajout de la prop `onShowDetail: (entryId: string) => void`.
- Chaque carte de la liste a maintenant deux boutons empilés : `Détails` (gris) et `Tracer` (gris). Marge `gap-1` pour rester confortable au stylet.
- Le `data-testid="glossary-detail-button"` permet de cibler le bouton dans les tests E2E.

### `src/App.tsx`
- `View` étendu en `'glossary' | 'detail' | 'practice'`. Ajout de `detailEntryId: string | null`.
- Trois handlers : `handleShowDetail` (glossary → detail), `handleBackToGlossary` (detail → glossary, vide `detailEntryId`), `handleBackFromPractice` (practice → detail si on vient de la fiche, sinon → glossary).
- Rendu conditionnel : `Glossary | EntryDetail | Canvas` selon la vue.

### i18n
- `fr.json` / `en.json` : nouvelle clé `glossary.details` (bouton) et sous-objet `glossary.detail.*` (`back`, `practice`, `facts`, `hsk`, `stroke_count`, `radicals`, `frequency`, `meanings`, `no_translations`, `appears_in_words`, `constituent_characters`, `examples`, `not_found`).

### Tests unitaires (Vitest)
- `EntryDetail.test.tsx` (8 tests) :
  - rendu d'un caractère (`char_4F60` = 你) avec hanzi, pinyin diacritique, section infos.
  - sens groupés par langue.
  - liste des mots associés non vide.
  - clic sur "Tracer" → `onPractice(hanzi)` reçu.
  - clic sur ← → `onBack()` reçu.
  - clic sur un mot lié → `onShowDetail(word_id)` reçu.
  - rendu d'un mot (`word_4f604eec` = 你们) avec 2 caractères constitutifs cliquables.
  - id inconnu → message "Entrée introuvable".
- `Glossary.test.tsx` : nouveau test `appelle onShowDetail quand on clique sur Détails` + signature des autres tests mise à jour avec la nouvelle prop.

### Tests E2E Playwright

- `entry-detail.spec.ts` (3 scénarios) :
  - `glossary → detail → practice → ← (detail) → ← (glossary)` : vérifie la back-stack à trois niveaux.
  - depuis la fiche d'un caractère, cliquer un mot lié change l'entry affichée en restant sur `entry-detail`.
  - depuis la fiche d'un mot, les caractères constitutifs sont cliquables et ouvrent leur fiche.

- `strict-mode-regression.spec.ts` (2 scénarios) — verrou explicite du bug du 28/05 :
  - **Toggle outline 3× puis tracer un trait** : assert `verdict-message` visible **et** aucun `pageerror` ni `console.error` contenant `quiz` / `hanzi` / `TypeError` / `cannot read`. Si la race condition revenait, l'erreur `Quiz is not ready` se déclencherait dans `validateStroke` et le verdict ne s'afficherait pas.
  - **Toggle outline 10× consécutivement** : stress test, l'instance reste `data-renderer-mounted="true"`, zone d'input visible, aucun pageerror.

## Vérifications

- `make test` : **101/101** unit tests verts (front 11 fichiers, back 2 paquets avec `-race`).
- `make test-e2e` : **15/15** scénarios E2E verts (Chromium, ~4.4 s). Soit 10 anciens + 3 fiche détaillée + 2 régression StrictMode.
- `make lint` : ESLint + Prettier propres, golangci-lint 0 issue.
- `make typecheck` : `tsc --noEmit` propre.

## Notes de mise en œuvre

- **Loading state séparé** dans `EntryDetail` : même pattern que `Glossary`. Le cache de `BundledDataSource` rend le second appel immédiat ; on garde le state pour l'asymétrie StrictMode / production cohérente.
- **Tri des langues** : langue courante en premier puis tri alphabétique. Comme aujourd'hui le bundle HSK 1 n'a que `en` côté traductions, l'effet est invisible en pratique — mais le code est prêt pour le jour où on enrichira avec d'autres langues.
- **Sécurité du cross-ref** : le `character_refs` stocké en uppercase hex tandis que le `word_id` est en lowercase. Pas de fragilité côté UI car on compare à l'`id` complet ; détecté au moment d'écrire les tests, ids vérifiés contre le bundle réel.
- **E2E regression** : on capture explicitement `page.on('pageerror')` et `page.on('console')`. Si une exception non capturée traversait le boundary React (cas du bug original), elle apparaîtrait dans `pageErrors` et ferait échouer le test. C'est ce filet de sécurité qui verrouille la non-régression durablement.

## État final du Lot 2

Les 4 étapes initiales sont **closes** :
1. ✅ Liste HSK 1.
2. ✅ Recherche pinyin/hanzi/sens.
3. ✅ Navigation glossary → canvas.
4. ✅ Fiches détaillées (cette session).

Lot 2 prêt à être clôturé. Prochaine décision : ouvrir le Lot 3 (à arbitrer dans une RFC dédiée si nouveau lot, ou explorer les pistes mentionnées dans `CURRENT_STATE.md` — tri/filtre par radical, stats d'apprentissage).
