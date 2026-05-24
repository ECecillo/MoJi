# CLAUDE.md

> Lu automatiquement par Claude Code à l'ouverture du projet. Court et orienté action.

## Le projet en trois lignes

Application web personnelle d'apprentissage des sinogrammes (HSK 3.0 niveau 1), centrée sur le **tracé manuel au stylet** sur tablette Boox Air 5c (e-ink). Mono-utilisateur, offline-first, installable en PWA. Stack : Vite + React + TS strict côté front, Go + SQLite côté back, architecture hexagonale des deux côtés.

## Point d'entrée pour reprendre le projet

**Lire en priorité** : [`docs/handoff/CURRENT_STATE.md`](docs/handoff/CURRENT_STATE.md).

Il décrit l'état exact du projet (lot en cours, dernières décisions, bloquants, prochaines étapes). Si une session de travail vient de se terminer, il a été mis à jour à cette occasion.

Pour la vision complète et figée : [`BRIEF.md`](BRIEF.md) à la racine.

## Organisation du repo

```
sinogrammes/
├── CLAUDE.md                # ce fichier
├── README.md                # présentation humaine
├── BRIEF.md                 # brief de cadrage initial (figé)
├── docs/                    # toute la doc projet
│   ├── rfc/                 # décisions structurantes (RFC numérotées)
│   ├── journal/             # une entrée par session de travail
│   └── handoff/             # CURRENT_STATE.md
├── frontend/                # Vite + React + TS (à venir)
├── backend/                 # Go + chi + SQLite (à venir)
└── shared/                  # JSON Schema partagé front/back (à venir)
```

## Conventions clés

- **Doc en français.** Code, identifiants et commentaires en anglais (termes techniques standards).
- **Architecture hexagonale** des deux côtés : `domain/` sans dépendances, `ports/` (interfaces), `adapters/` (implémentations). Tout doit être plug-and-play.
- **TDD obligatoire** dans `domain/`, optionnel dans `adapters/`, rare dans `ui/`. Cycle red → green → refactor.
- **Schéma de données versionné en SemVer strict** (`schema_version` au top niveau). Migrations rétrocompatibles en MINOR, cassantes en MAJOR uniquement avec migration explicite + backup.
- **Offline-first** : la logique métier tourne côté client. Le backend est un service de persistance et de sync, jamais un point de passage obligé.
- **Pointer Events** uniquement (jamais Touch ou Mouse seuls) pour gérer le stylet Wacom.
- **E-ink awareness** : minimalisme visuel, animations rares ou désactivables, respect de `prefers-reduced-motion` et `prefers-contrast`.

## Rythme de travail

- Découpé en **lots** (cf. [`docs/rfc/0007-decoupage-en-lots.md`](docs/rfc/0007-decoupage-en-lots.md)). On ne saute pas de lot, on ne mélange pas.
- À chaque session : tenir à jour `CURRENT_STATE.md` et écrire une entrée de journal `docs/journal/AAAA-MM-JJ-titre.md`.
- Décision structurante = nouvelle RFC. Pas de décision implicite enterrée dans un commit.

## Ce que Claude Code ne fait pas

- Pas de code applicatif tant que le Lot 0 n'est pas explicitement démarré.
- Pas de modification du brief (`BRIEF.md`) : c'est un document figé. Toute évolution passe par une RFC.
- Pas de raccourci sur l'hexagonal "parce que c'est trop tôt" : la discipline est demandée dès la première ligne.
