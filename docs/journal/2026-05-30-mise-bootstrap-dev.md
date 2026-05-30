# 2026-05-30 (5) — Bootstrap développeur avec mise

## Objectif de la session

Faciliter l'arrivée d'un autre développeur sur le projet : installer la toolchain système et les dépendances applicatives avec une commande reproductible, sans remplacer le Makefile existant.

## Ce qui a été fait

- Ajout de [`../../mise.toml`](../../mise.toml) à la racine.
- Versions pinées : Node 24.15.0, Go 1.26.2, golangci-lint 2.9.0.
- Tâche `mise run setup` : lance `make install`, puis installe Chromium pour Playwright via `npx playwright install chromium`.
- Tâches miroir vers le Makefile : `install`, `dev`, `dev-front`, `dev-back`, `test`, `test-e2e`, `lint`, `typecheck`, `build`, `docs`, `build-data`.
- Mise à jour du README avec un quick start court : `mise trust`, `mise install`, `mise run setup`, `make dev`.
- Ajout d'une section "Commandes projet" qui renvoie au Makefile (`make help`) au lieu de dupliquer la liste des commandes.
- Correction du statut README qui indiquait encore le Lot 0.

## Décisions prises

- **`mise` ne remplace pas `make`** : le Makefile reste la source d'orchestration du projet. `mise` gère les versions d'outils et expose des alias ergonomiques.
- **Playwright Chromium est installé par `mise run setup`**, pas par `make install`, pour éviter de rendre la cible Make historique plus lourde par surprise.

## Reste à faire

- Si de nouveaux outils système deviennent nécessaires (ex. goose CLI, sqlite CLI, outil PWA), les ajouter dans `mise.toml` au moment où une cible du projet les utilise réellement.
