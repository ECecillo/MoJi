# internal/migrations/

Migrations SQL versionnées par [pressly/goose](https://github.com/pressly/goose).

## Convention

- Un fichier `.sql` par migration, nommé `NNNNNNNNNNNNNN_titre.sql` (timestamp + titre kebab-case).
- Format goose standard : sections `-- +goose Up` et `-- +goose Down`.
- Appliqué automatiquement au démarrage du serveur (`goose up`) — idempotent.

## État

À ce stade (Lot 0), aucune migration n'est nécessaire (le backend n'a pas encore de schéma SQL). Les premières migrations arriveront au Lot 3 avec la persistance de la progression.

## Versioning

Le versioning SQL (goose) et le versioning du JSON Schema (cf. [RFC 0004](../../../docs/rfc/0004-format-de-donnees-et-versioning.md)) sont **indépendants** : ils servent des artefacts différents.
