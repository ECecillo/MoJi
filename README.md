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
| Backend  | Go 1.22+, chi, SQLite (`modernc.org/sqlite`), goose, testify                          |
| Données  | JSON Schema partagé (`shared/schema/`), tracés [Make Me a Hanzi](https://github.com/skishore/makemeahanzi), définitions CC-CEDICT |

Architecture **hexagonale** des deux côtés. Toute dépendance externe est isolée derrière un port.

## Documentation

- [`BRIEF.md`](BRIEF.md) — brief de cadrage initial, figé.
- [`CLAUDE.md`](CLAUDE.md) — instructions pour Claude Code.
- [`docs/`](docs/) — RFC, journal de bord, état courant.
- [`docs/handoff/CURRENT_STATE.md`](docs/handoff/CURRENT_STATE.md) — **point d'entrée pour reprendre** : ce qui se passe maintenant.

## Statut

Projet en phase de démarrage (Lot 0 — fondations). Pas encore de code applicatif. Voir `CURRENT_STATE.md` pour le détail.

## Licence

Projet personnel, non publié. Pas de licence définie pour l'instant.
