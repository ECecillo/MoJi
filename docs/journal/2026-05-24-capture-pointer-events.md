# 2026-05-24 — Capture Pointer Events du canvas

## Objectif de la session

Poursuivre le Lot 1 après l'adapter Hanzi Writer : poser un premier composant `<Canvas />` qui capture le tracé au stylet via Pointer Events et délègue la validation au port `CharacterRenderer`.

## Ce qui a été fait

- `frontend/src/features/canvas/Canvas.tsx` ajouté :
  - reçoit un `CharacterRenderer` injecté et un `hanzi`;
  - monte/démonte le renderer dans un calque dédié;
  - capture `pointerdown`, `pointermove`, `pointerup`, `pointercancel`;
  - utilise `setPointerCapture` / `releasePointerCapture` quand disponible;
  - calcule les coordonnées locales depuis `getBoundingClientRect()`;
  - conserve pression (`pressure`) et inclinaison (`tiltX`, `tiltY`);
  - appelle `renderer.validateStroke()` au `pointerup`;
  - expose `onStrokeValidated(result, attempt)` pour la future orchestration de session;
  - dessine un retour visuel minimal en SVG : noir si accepté, gris si refusé.
- `frontend/src/features/canvas/Canvas.test.tsx` ajouté :
  - 6 tests React/jsdom;
  - montage/démontage du renderer;
  - capture points + pression + inclinaison;
  - validation au `pointerup`;
  - rendu d'un trait accepté/refusé;
  - annulation via `pointercancel`;
  - ignore des pointeurs non primaires.

## Découvertes / surprises

- jsdom/Vitest ne peuple pas correctement les propriétés `PointerEvent` via `fireEvent.pointerDown`. Les tests utilisent donc un helper qui émet un `MouseEvent` nommé `pointerdown` et y définit explicitement `pointerId`, `pointerType`, `isPrimary`, `pressure`, `tiltX`, `tiltY`.
- Le composant reste volontairement non câblé dans `App.tsx` pour garder l'étape focalisée sur la capture et le contrat avec `CharacterRenderer`.

## Décisions prises

Aucune nouvelle RFC. L'étape applique les décisions existantes : Pointer Events uniquement, logique de tracé côté client, composants front dans `features/`.

## Vérifications

- `npm test -- Canvas` : 6 tests verts.
- `npm test` côté front : 67 tests verts.
- `npm run typecheck` côté front : vert.
- `npm run lint` côté front : vert après format Prettier.

## Reste à faire / prochaines étapes

- Câbler `BundledDataSource`, `HanziWriterRenderer` et `<Canvas />` dans une première expérience utilisateur.
- Ajouter les grilles Tian Zi Ge, Mi Zi Ge, Hui Zi Ge.
- Ajouter les modes modèle semi-transparent / caché.
- Tester l'interaction réelle sur Boox avec stylet Wacom.
