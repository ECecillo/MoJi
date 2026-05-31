# 2026-05-30 (6) — Lot 3 sprint 2 : UI Enhancements & Dashboard

## Objectif de la session

Continuer l'implémentation du Lot 3 en enrichissant l'UI avec les données de progression :

1. Ajouter des filtres par statut d'apprentissage dans le glossaire.
2. Afficher des indicateurs visuels (badges/dots) sur les items du glossaire.
3. Afficher les statistiques de progression détaillées dans la fiche d'un caractère.
4. Créer un tableau de bord (Dashboard) pour avoir une vue d'ensemble de l'apprentissage.

## Ce qui a été fait

### Filtres et Logique (`src/lib/glossaryFilters.ts`)

- Extension de `GlossaryFilters` avec l'axe `status: Set<LearningStatus>`.
- Types de statuts définis : `new` (jamais vu), `learning` (vu mais pas maîtrisé), `due` (à réviser), `mastered` (maîtrisé, intervalle ≥ 30j).
- Mise à jour de `matchesFilters` pour intégrer la progression et la date courante.
- Ajout de tests unitaires couvrant la logique de filtrage par statut (17 tests au total dans ce fichier).

### Glossaire (`src/features/glossary/Glossary.tsx`)

- Intégration du hook `useProgress` pour récupérer la progression réelle.
- Ajout de `StatusDot` : un petit point de couleur (bleu=learning, orange=due, vert=mastered) en haut à droite du hanzi dans la liste.
- Mise à jour du `FilterPanel` : ajout d'une section "Statut d'apprentissage" permettant le multi-sélection des statuts.
- Badge sur le bouton "Filtres" mis à jour pour inclure l'axe statut.

### Fiche détaillée (`src/features/glossary/EntryDetail.tsx`)

- Ajout d'une section **Progression** (visible seulement si l'item a déjà été vu).
- Affichage des champs : Statut, Tentatives, Succès, Dernier passage, Prochaine révision.
- Mise en page responsive (grid 2 colonnes sur desktop pour Facts + Progression).

### Tableau de bord (`src/features/progress/Dashboard.tsx`)

- Nouveau composant `Dashboard`.
- **Cartes de statistiques** : répartition des caractères par statut avec pourcentages.
- **Activité récente** : liste des 5 derniers caractères travaillés avec leur taux de succès et date de passage.
- Navigation : accessible via une icône 📊 dans le header depuis le glossaire.

### App et Navigation (`src/App.tsx`)

- Ajout de l'état `view === 'dashboard'`.
- Header mis à jour : bouton 📊 ajouté à côté du bouton Réviser.
- Orchestration de la navigation Dashboard ↔ Glossary et Dashboard → Practice.

### i18n FR/EN

- Ajout de toutes les clés nécessaires pour les statuts, les labels du dashboard et les champs de progression.

## Vérifications

- `make test` : **198 tests front passent** (5 nouveaux tests unitaires pour les filtres).
- `make test-e2e` : **28/28 tests E2E passent**. Note : les tests E2E existants valident la non-régression sur le glossaire et la progression SRS, mais n'ont pas encore été étendus spécifiquement pour le Dashboard (à faire au prochain sprint).
- Lint et Typecheck propres.

## Notes

- L'indicateur visuel dans le glossaire est un simple point (`StatusDot`) pour rester discret sur les écrans e-ink et ne pas polluer la lisibilité des caractères.
- Le statut `mastered` a été arbitrairement fixé à un intervalle SRS de 30 jours.
- Le dashboard se concentre pour l'instant sur les **caractères** (unité SRS actuelle).

## Prochaines étapes — Lot 3 backend

- RFC pour la synchronisation backend.
- Implémentation du backend Go (modèle SQL, endpoints).
- Passage de `localStorage` à `IndexedDB` si nécessaire pour la sync.
