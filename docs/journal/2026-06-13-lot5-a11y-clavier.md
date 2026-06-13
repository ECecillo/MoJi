# 2026-06-13 — Lot 5 : audit accessibilité navigation clavier

## Objectif de la session

Traiter l'item « Audit accessibilité (navigation clavier) » du Lot 5 (RFC 0007).

## Audit

- **Atteignabilité** : tous les contrôles interactifs sont des `<button>` ou des
  champs natifs (`input`, `select`) — aucun `onClick` sur `div`/`span`. Donc tout est
  atteignable au clavier (Tab / Entrée) sans `tabindex` ni `role` ajoutés. La zone de
  saisie stylet est `role="application"` + `tabIndex=0` (focusable ; le tracé reste
  pointeur, inhérent à l'app).
- **Défaut trouvé** : l'indicateur de focus clavier n'existait qu'en
  `prefers-contrast: more`. En contraste normal, on s'appuyait sur l'anneau par défaut
  du navigateur — **sauf** sur 6 champs (recherche, éditeur FR, 4 plages de filtre) qui
  posaient `focus:outline-none` **sans remplacement** → focus invisible au clavier.

## Correctifs

- `index.css` : ajout d'un `:focus-visible { outline: 2px solid #111; outline-offset: 2px }`
  **global** (e-ink, noir net), en plus du renforcement à 3px sous `prefers-contrast`.
  Indicateur cohérent sur tous les éléments focusables.
- Retrait du `focus:outline-none` nu des 6 champs (`Glossary` ×5, `EntryDetail` ×1) :
  ils héritent désormais de l'indicateur global. `SpeakButton` conserve son anneau
  visible existant.

## Vérifications (sous Node épinglé)

- `make typecheck` / `make lint` : propres.
- `make test-e2e` : 31/31 (Chromium).

## Reste / pistes

- Gestion du focus au changement de vue (déplacer le focus vers le bouton retour /
  titre en entrant dans détail/practice/dashboard) : amélioration possible, non
  bloquante — laissée de côté pour ne pas fragiliser le flux canvas.
- Seul reste du Lot 5 : test d'installation réel sur Boox (matériel).
