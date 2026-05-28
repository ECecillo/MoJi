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
├── AGENTS.md                # miroir cross-outils de CLAUDE.md
├── README.md                # présentation humaine
├── BRIEF.md                 # brief de cadrage initial (figé)
├── Makefile                 # orchestration front + back (cf. section Commandes)
├── docs/                    # toute la doc projet
│   ├── rfc/                 # décisions structurantes (RFC numérotées)
│   ├── journal/             # une entrée par session de travail
│   └── handoff/             # CURRENT_STATE.md
├── frontend/                # Vite + React + TS strict
│   ├── scripts/             # pipelines de données (vendor + build, cf. RFC 0008)
│   └── src/
│       ├── domain/          # logique pure : schema/, migrations/, ports/
│       ├── adapters/        # implémentations concrètes (renderer/, storage/, api/)
│       ├── features/, ui/, i18n/, lib/, data/, test/
├── backend/                 # Go + chi + SQLite (modernc.org/sqlite)
│   ├── cmd/server/
│   └── internal/
│       ├── domain/, ports/, config/
│       ├── adapters/{http,sqlite}/
│       └── migrations/      # SQL goose
└── shared/                  # artefacts partagés
    ├── schema/              # JSON Schema v1 + fixtures (source de vérité)
    └── data/sources/        # snapshots upstream pinned (vendored)
```

## Conventions clés

- **Doc en français.** Code, identifiants et commentaires en anglais (termes techniques standards).
- **Architecture hexagonale** des deux côtés : `domain/` sans dépendances, `ports/` (interfaces), `adapters/` (implémentations). Tout doit être plug-and-play.
- **TDD obligatoire** dans `domain/`, optionnel dans `adapters/`, rare dans `ui/`. Cycle red → green → refactor.
- **Schéma de données versionné en SemVer strict** (`schema_version` au top niveau). Migrations rétrocompatibles en MINOR, cassantes en MAJOR uniquement avec migration explicite + backup.
- **Offline-first** : la logique métier tourne côté client. Le backend est un service de persistance et de sync, jamais un point de passage obligé.
- **Pointer Events** uniquement (jamais Touch ou Mouse seuls) pour gérer le stylet Wacom.
- **E-ink awareness** : minimalisme visuel, animations rares ou désactivables, respect de `prefers-reduced-motion` et `prefers-contrast`.

## Commandes utiles

Toutes les commandes se lancent **depuis la racine du repo** via `make`. `make help` liste toutes les cibles disponibles.

### À lancer avant chaque commit

| Commande         | Effet                                                             |
|------------------|-------------------------------------------------------------------|
| `make test`      | Vitest côté front + `go test -race` côté back                     |
| `make lint`      | ESLint + Prettier (front) + golangci-lint (back)                  |
| `make typecheck` | `tsc --noEmit` strict côté front                                  |

Les trois doivent passer vert. En cas d'erreurs de format Prettier : `cd frontend && npm run lint:fix`.

### Développement

| Commande           | Effet                                                             |
|--------------------|-------------------------------------------------------------------|
| `make dev`         | Lance front (http://127.0.0.1:5173) **et** back (http://127.0.0.1:8787) en parallèle. Ctrl-C arrête les deux. |
| `make dev-front`   | Front seul (Vite).                                                |
| `make dev-back`    | Back seul (`go run ./cmd/server`).                                |
| `make build`       | Bundle front (`dist/`) + binaire back (`backend/bin/server`).     |
| `make install`     | `npm install` côté front + `go mod download` côté back.           |

### Pipeline de données (cf. [RFC 0008](docs/rfc/0008-sourcing-hsk1.md))

| Commande              | Effet                                                                                       |
|-----------------------|---------------------------------------------------------------------------------------------|
| `make build-data`     | **Offline**. Régénère `frontend/src/data/hsk1.generated.json` depuis `shared/data/sources/`. Valide via Zod : si la validation échoue, aucun fichier n'est écrit. À relancer après toute modification du schéma ou des sources vendorées. |
| `make vendor-sources` | **Réseau**, rare. Rafraîchit `shared/data/sources/` depuis les SHA upstream pinnés (drkameleon + makemeahanzi). À utiliser pour bumper une version amont. |

### Carnet de bord HTML

| Commande      | Effet                                                                                          |
|---------------|------------------------------------------------------------------------------------------------|
| `make docs`   | Régénère `docs/index.html` à partir de `BRIEF.md`, `docs/handoff/CURRENT_STATE.md`, des RFC et du journal. Fichier autonome, ouvrable directement dans un navigateur (file://). |

**À lancer obligatoirement** après toute modification d'un fichier markdown dans `docs/` ou de `BRIEF.md`, avant le commit. L'index HTML est régénéré, jamais édité à la main.

### Nettoyage

`make clean` — supprime `dist/`, `bin/`, coverage.

## Rythme de travail

- Découpé en **lots** (cf. [`docs/rfc/0007-decoupage-en-lots.md`](docs/rfc/0007-decoupage-en-lots.md)). On ne saute pas de lot, on ne mélange pas.
- À chaque fin de session / feature : tenir à jour `CURRENT_STATE.md`, écrire une entrée de journal `docs/journal/AAAA-MM-JJ-titre.md`, **puis lancer `make docs`** pour rafraîchir le carnet HTML (cf. section Commandes).
- Décision structurante = nouvelle RFC. Pas de décision implicite enterrée dans un commit.
- **Commits thématiques** (un sujet par commit), messages en français au style Conventional Commits (`feat(scope): …`, `docs: …`, `build: …`, `fix: …`). La régénération de `docs/index.html` accompagne le commit qui modifie les markdown correspondants — pas dans un commit séparé.

## Ce que Claude Code ne fait pas

- **Pas de modification de fichiers générés ou vendorés à la main** :
  - `frontend/src/data/*.generated.json` se régénère via `make build-data`.
  - `shared/data/sources/*` se régénère via `make vendor-sources`.
  - `docs/index.html` se régénère via `make docs` après toute modification de markdown sous `docs/` ou de `BRIEF.md`.
- **Pas de modification du brief (`BRIEF.md`)** : document figé. Toute évolution passe par une RFC.
- **Pas de raccourci sur l'hexagonal** : `src/domain/` n'importe jamais `src/adapters/` ; le lint le vérifie via `no-restricted-imports`.
- **Pas de code applicatif sans correspondance avec un lot ouvert** : se référer à `CURRENT_STATE.md` pour savoir quel lot est en cours.
- **Pas de commit sans `make test && make lint && make typecheck` verts.**
