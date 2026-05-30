# 2026-05-30 (2) — Canvas : détection trait répété + boutons Annuler / Tout effacer

## Objectif de la session

Réponse à deux retours d'usage utilisateur :

1. Quand un trait est validé, le retracer (par erreur ou volontairement) renvoie un verdict "Mauvais trait" peu compréhensible — Hanzi Writer évalue le tracé contre le trait *suivant* attendu, pas contre celui qui vient d'être validé.
2. Aucun moyen d'effacer les traits déjà tracés sans changer de caractère.

## Décisions

- **Détection géométrique du trait répété** côté UI, dans `Canvas`, sans toucher au port `CharacterRenderer`. Une nouvelle valeur de `reason` (`repeated_stroke`) est synthétisée par `Canvas` lui-même, le port le signale dans son commentaire mais l'adapter Hanzi Writer ne la produit jamais directement. Heuristique : comparaison des **endpoints** (début + fin) entre le tracé refusé et chaque tracé précédemment validé, avec une tolérance de 15 % de la taille du canvas (~48 px pour 320). Trajectoire intermédiaire ignorée volontairement — seule la position des extrémités compte pour détecter "je viens de refaire ça".
- **Trait répété = pas de pollution du SVG** : la polyline du re-trace n'est pas ajoutée à `completedStrokes` (la polyline pâle du trait original suffit). Seul le verdict change.
- **Trait inversé n'est PAS un trait répété** : si l'utilisateur trace dans le mauvais sens, les endpoints sont permutés, la similarité retourne false, et Hanzi Writer continue à signaler `wrong_direction`. C'est volontaire : on ne veut pas masquer un feedback pédagogique utile derrière le motif "déjà tracé".
- **Deux boutons sous le canvas** :
  - `Annuler le dernier trait` (data-testid `undo-last`) : retire le dernier tracé du SVG (accepté ou refusé), efface le verdict, **ne touche pas à l'état du quiz Hanzi Writer**. Pour défaire l'avancement Hanzi Writer, il faut Tout effacer.
  - `Tout effacer` (data-testid `reset-all`) : `renderer.reset()` + vidage des `completedStrokes` / `currentPoints` / `verdict`. Remise à zéro complète.
- Les deux boutons sont **désactivés tant qu'il n'y a rien à défaire** (zéro tracé pour Annuler, zéro tracé ET pas de verdict pour Tout effacer).

## Architecture

- **`src/lib/strokeSimilarity.ts`** : helper pur, sans dépendance, testable en isolation. Exporte `strokesAreSimilar(a, b, { endpointToleranceInPx })` et `endpointToleranceFromCanvasSize(sizeInPx, ratio = 0.15)`. Vit dans `lib/` parce qu'il n'est ni domain métier ni adapter — c'est de l'algo générique. 9 tests Vitest.
- **`src/domain/ports/CharacterRenderer.ts`** : extension de l'union `reason` avec `repeated_stroke` + commentaire qui précise que c'est une valeur synthétisée par l'UI, pas par l'adapter.
- **`src/features/canvas/Canvas.tsx`** : finishStroke importe le helper, calcule la similarité, requalifie le verdict si match. Ajout de `undoLastStroke` et `resetAll`. Les boutons sont rendus juste après le bloc de feedback, hors du SVG.
- **i18n FR/EN** : `canvas.verdict_refused.repeated_stroke`, `canvas.undo_last`, `canvas.reset_all`.

## Tests

### Unitaires (Vitest) — 116 tests verts au total

- `src/lib/strokeSimilarity.test.ts` (9 tests) : endpoints proches → true ; un endpoint éloigné → false ; trait vide → false ; trajectoire au milieu ignorée ; **trait inversé NON détecté comme répété** ; point isolé dégénéré.
- `src/features/canvas/Canvas.test.tsx` (+7 tests) :
  - trait refusé qui matche un trait accepté → verdict "déjà tracé" + une seule polyline dans le DOM ;
  - trait refusé loin d'un trait accepté → verdict "mauvais trait" + 2 polylines ;
  - Annuler retire la dernière polyline et efface le verdict ;
  - Tout effacer vide tout, remet le compteur à 0, et appelle `renderer.reset()` ;
  - boutons désactivés au montage, activés après le premier trait.

### E2E Playwright — 18 tests verts au total

- `e2e/canvas-controls.spec.ts` (3 scénarios) :
  - boutons désactivés à l'arrivée, actifs après un trait ;
  - Tout effacer remet le compteur à 0 et supprime les polylines user (filtré sur `data-testid="stroke-*"` pour ne pas confondre avec les polylines du quiz Hanzi Writer) ;
  - Annuler retire un seul tracé et efface le verdict.

## Vérifications

- `make test` : **116/116** verts.
- `make test-e2e` : **18/18** verts (~3,6 s).
- `make lint` / `make typecheck` propres.

## Notes

- Le port `CharacterRenderer` continue d'être agnostique d'Hanzi Writer. La synthèse `repeated_stroke` est une décision UI, pas une responsabilité du renderer. C'est cohérent avec la philosophie hexagonale du projet (RFC 0003).
- La tolérance à 15 % a été choisie empiriquement — assez large pour absorber l'imprécision naturelle du re-trace, assez serrée pour ne pas mélanger deux traits voisins distincts du même caractère.
- `Annuler` ne désynchronise pas l'état du quiz Hanzi Writer avec l'affichage : si on annule un trait accepté, le compteur "N traits validés" diminue mais Hanzi Writer attend toujours le trait N+1. C'est documenté inline. Si ça s'avère gênant à l'usage, la prochaine itération pourrait soit (a) limiter Annuler aux traits refusés, soit (b) ajouter une variante "Annuler le dernier validé" qui implique un reset + replay des N-1 premiers.

## Reste à faire

Aucun bloquant. Lot 2 toujours clôturé ; cette session est un correctif UX qui s'inscrit dans la continuité du Lot 1 / Lot 2 sans modifier le découpage.
