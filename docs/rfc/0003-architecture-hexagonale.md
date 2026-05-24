# RFC 0003 — Architecture hexagonale

- **Statut** : Accepté
- **Date** : 2026-05-24
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0002 (stack), RFC 0004 (données), RFC 0006 (offline)

## Contexte

L'utilisateur a explicitement demandé que tout soit **plug-and-play** : pouvoir remplacer Hanzi Writer, changer de transport (REST → gRPC), changer de base de données, ou faire évoluer la couche stockage côté client (IndexedDB → autre) **sans gros refacto**.

Cette exigence se traduit naturellement par une **architecture hexagonale** (ports & adapters) appliquée aux deux côtés (front et back). Elle est suffisamment légère pour un projet de cette taille tout en garantissant la séparation des préoccupations.

## Décision

### Principe général

On distingue trois couches :

- **`domain/`** : logique métier pure, aucune dépendance externe. Définit les entités, les règles, les opérations.
- **`ports/`** : interfaces définissant les contrats avec l'extérieur. Le domaine dépend des ports, jamais des adapters.
- **`adapters/`** : implémentations concrètes des ports (HTTP, SQLite, IndexedDB, Hanzi Writer, etc.).

Règle d'or : **le domaine ne connaît jamais les détails d'implémentation**. Il connaît uniquement les ports.

### Côté frontend

```
frontend/src/
├── domain/
│   ├── schema/         # types, validateurs Zod, version du schéma
│   ├── migrations/     # orchestrateur de migrations de schéma
│   └── ports/          # interfaces : CharacterRenderer, ProgressRepository, DataSource, etc.
├── adapters/
│   ├── renderer/       # ex. HanziWriterRenderer.ts (Lot 1)
│   ├── storage/        # ex. IndexedDBProgressRepository.ts (Lot 3)
│   └── api/            # ex. RestApiClient.ts (Lot 3)
├── features/           # canvas/, glossary/, review/, voice/ — orchestrent ports + UI
├── ui/                 # composants UI réutilisables, sans logique métier
└── i18n/, lib/         # support
```

**Ports identifiés au démarrage** :

- `CharacterRenderer` — encapsule le rendu et la validation du tracé. Implémentation initiale : `HanziWriterRenderer`.
- `ProgressRepository` — persistance de la progression utilisateur (SRS, stats). Implémentation initiale : `IndexedDBProgressRepository`.
- `DataSource` — accès aux données de référence (caractères, mots, decks). Implémentation initiale : `BundledDataSource` (cf. RFC 0006).

D'autres ports apparaîtront avec les lots : `SpeechSynthesizer`, `SessionStore`, etc.

### Côté backend

```
backend/
├── cmd/server/main.go
└── internal/
    ├── domain/         # entités et règles métier pures
    ├── ports/          # interfaces (ProgressStore, etc.)
    ├── adapters/
    │   ├── http/       # handlers chi
    │   └── sqlite/     # repositories sur SQLite
    ├── migrations/     # migrations SQL versionnées par goose
    └── config/         # chargement de la config
```

Le backend est volontairement **minimal** au démarrage : il sert essentiellement à persister la progression et à fournir un point de synchronisation entre appareils (cf. RFC 0006). Le domaine reste petit.

### Règles de discipline

1. **Aucun import inversé** : `domain/` n'importe rien de `adapters/`, `ports/` n'importe rien de `adapters/`. Vérifiable mécaniquement (ESLint côté front avec `import/no-restricted-paths`, structure de packages côté Go).
2. **Les ports sont nommés par capacité** (`CharacterRenderer`, `ProgressRepository`), pas par technologie (`HanziWriter`, `SQLite`).
3. **Une nouvelle implémentation = nouveau fichier dans `adapters/`**. Aucun fichier de domaine ou de port ne bouge.
4. **Les tests de domaine ne dépendent d'aucun adapter** (TDD pur, sans mock de framework).

### Exemples concrets

- **Remplacer Hanzi Writer** : créer `adapters/renderer/SvgRenderer.ts` qui implémente `CharacterRenderer`. Câbler dans le bootstrap de l'app. Aucune autre ligne de code ne change.
- **Ajouter gRPC côté back** : créer `internal/adapters/grpc/` qui réutilise les services du domaine. Le code REST existant continue à tourner.
- **Tester le SRS** : tests unitaires purs sur le domaine, sans IndexedDB, sans réseau, sans React.

## Conséquences

- **Coût initial** : un peu de cérémonie au Lot 0 (créer les répertoires et les interfaces vides). Acceptable.
- **Bénéfice** : à chaque lot, on sait exactement où mettre quoi. Pas de débat. Pas de refacto.
- **Testabilité maximale** du domaine : la logique critique (validation de schéma, migrations, SRS) est testable sans monter d'environnement.
- **Pas de dogme** : pour un mono-développeur sur un projet perso, on accepte l'hexagonal "léger" — pas de DDD agressif, pas de CQRS, pas d'event sourcing.

## Alternatives considérées

- **Architecture en couches classique** (MVC / services / repositories) : refusé. Moins explicite sur la frontière, encourage les fuites de dépendances.
- **Clean Architecture stricte (Uncle Bob)** : refusé. Trop cérémonieuse pour la taille du projet, sans bénéfice supplémentaire par rapport à l'hexagonal léger.
- **Pas d'architecture explicite, on verra plus tard** : refusé. Les briques à remplacer (Hanzi Writer, transport) sont connues dès le départ. Mieux vaut isoler dès le Lot 0.
