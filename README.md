# Sinogrammes

Application web personnelle d'apprentissage des sinogrammes (caractères chinois), pensée pour la **pratique du tracé manuel au stylet** sur tablette e-ink Boox Air 5c, avec validation de l'ordre et de la direction des traits.

## Objectifs

- Apprendre les **300 caractères + 500 mots** de la liste HSK 3.0 niveau 1.
- S'entraîner au tracé sur tablette e-ink, sans dépendre d'une connexion réseau.
- Réviser ces caractères et mots via un système de répétition espacée.
- Consulter un glossaire trié et recherchable.

## Plateformes cibles

- **Tablette Boox Air 5c** (Android, Chromium 111, stylet Wacom) — usage principal pour le tracé.
- **Ordinateur (desktop / portable)** — révision et glossaire uniquement.
- Installable en **PWA**, fonctionne **offline-first**.

## Stack

| Côté     | Technologies                                                                          |
|----------|---------------------------------------------------------------------------------------|
| Frontend | Vite, React 18, TypeScript strict, Tailwind, Zod, i18next, Vitest, Hanzi Writer       |
| Backend  | Go 1.26.2, chi, SQLite (`modernc.org/sqlite`), goose, testify                         |
| Données  | JSON Schema partagé (`shared/schema/`), tracés [Make Me a Hanzi](https://github.com/skishore/makemeahanzi), définitions CC-CEDICT |

Architecture **hexagonale** des deux côtés. Toute dépendance externe est isolée derrière un port.

## Quick start

Le chemin recommandé passe par [`mise`](https://mise.jdx.dev/), qui installe les versions d'outils déclarées dans [`mise.toml`](mise.toml) : Node, Go et golangci-lint.

Prérequis hors projet : `mise` et `make`.

```sh
mise trust
mise install
mise run setup
make dev
```

`mise run setup` lance `make install` puis installe le navigateur Chromium utilisé par Playwright.

Sans mise, il faut installer manuellement Node 24.15.0, Go 1.26.2 et golangci-lint 2.9.0, puis lancer `make install`.

## Commandes projet

Toutes les commandes liées au projet sont centralisées dans le [`Makefile`](Makefile). Lancer `make help` depuis la racine pour voir les cibles disponibles.

## Documentation

- [`BRIEF.md`](BRIEF.md) — brief de cadrage initial, figé.
- [`CLAUDE.md`](CLAUDE.md) — instructions pour Claude Code.
- [`docs/`](docs/) — RFC, journal de bord, état courant.
- [`docs/handoff/CURRENT_STATE.md`](docs/handoff/CURRENT_STATE.md) — **point d'entrée pour reprendre** : ce qui se passe maintenant.

## Statut

Lot 3 en cours : le tracé, le glossaire et la première boucle de révision locale sont en place. Voir `CURRENT_STATE.md` pour le détail.

## Licence

Projet personnel, non publié. Pas de licence définie pour l'instant.
