# shared/

Artefacts partagés entre `frontend/` et `backend/`. Source de vérité unique pour les formats de données.

## Contenu

- `schema/data-schema.v1.json` — JSON Schema officiel du format de données de l'application (cf. [RFC 0004](../docs/rfc/0004-format-de-donnees-et-versioning.md)). Toute évolution structurante du schéma passe par ce fichier en premier, puis se répercute dans les types TS (`frontend/src/domain/schema/`) et les structs Go (`backend/internal/domain/`).
- `schema/examples/` — fixtures d'exemple conformes au schéma, utilisées par les tests des deux côtés.

## Règles

- Le nom de fichier suit le pattern `data-schema.vMAJOR.json`. Un changement MAJOR de schéma = nouveau fichier (`v2.json`) accompagné d'une migration explicite côté front, jamais d'une réécriture en place.
- Les changements MINOR (ajout de champs optionnels, ajout d'entités) sont **rétrocompatibles** et restent dans le même fichier vN.
- Les changements PATCH ne modifient pas la structure (correction de description, exemple, etc.).

Cf. RFC 0004 pour la politique complète de versioning.
