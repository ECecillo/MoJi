# Journal : Grilles calligraphiques et modes d'affichage

- **Date** : 2026-05-24
- **Lot** : 1 — Canvas et validation de tracé
- **Auteur** : Enzo

## Objectif

Finaliser le Lot 1 en ajoutant les aides visuelles indispensables au tracé (grilles calligraphiques) et les options de visibilité du modèle (outline vs character).

## Travail réalisé

### 1. Grilles calligraphiques (`CharacterGrid`)

Création d'un composant UI dédié `CharacterGrid` utilisant SVG pour afficher trois types de grilles classiques :
- **Tian Zi Ge (田)** : Croix centrale simple.
- **Mi Zi Ge (米)** : Croix centrale + diagonales.
- **Hui Zi Ge (回)** : Croix centrale + carré intérieur.

Le composant est conçu pour l'e-ink avec des traits pointillés (`stroke-dasharray`) et un contraste élevé.

### 2. Contrôle de la visibilité

Extension du port `CharacterRenderer` et de son implémentation `HanziWriterRenderer` pour inclure :
- `showOutline()` / `hideOutline()` : pour le modèle en filigrane (gris).
- `showCharacter()` / `hideCharacter()` : pour le caractère complet (noir).

Ces méthodes ont été synchronisées dans le composant `<Canvas />` via des props React, permettant un basculement dynamique.

### 3. Intégration et Démo

Mise à jour de `App.tsx` pour transformer le squelette initial en une véritable démo du Lot 1 :
- Chargement des données réelles HSK 1 via `BundledDataSource`.
- Sélecteur horizontal des 10 premiers caractères pour tester la réactivité et le changement de cible.
- Boutons de contrôle pour changer le type de grille et masquer/afficher l'outline.
- Ajout d'une utilité CSS `scrollbar-hide` pour un rendu plus propre sur tablette.

## Validation technique

- **Tests unitaires** : Ajout de tests pour `CharacterGrid` (6 tests) et mise à jour de `Canvas.test.tsx` et `HanziWriterRenderer.test.tsx` pour couvrir les nouvelles fonctionnalités.
- **Typecheck** : `tsc --noEmit` est passé vert après correction de quelques imports inutilisés.
- **Lint** : Respect des standards Prettier/ESLint.

## État final Lot 1

Le Lot 1 est considéré comme **clôturé**. L'application permet désormais de :
1. Choisir un caractère parmi les données HSK 1 bundlées.
2. Le voir s'afficher avec ou sans guide visuel.
3. Choisir un type de grille d'aide.
4. Le tracer au stylet avec une validation immédiate de l'ordre et de la direction.

Prochaine étape : **Lot 2 — Glossaire** pour naviguer dans l'intégralité du corpus HSK 1.
