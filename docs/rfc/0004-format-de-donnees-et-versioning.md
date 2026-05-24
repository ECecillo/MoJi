# RFC 0004 — Format de données et versioning

- **Statut** : Accepté
- **Date** : 2026-05-24
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0002 (stack), RFC 0003 (hexagonale), RFC 0006 (offline)

## Contexte

L'application manipule deux familles de données :

1. **Données de référence** : caractères, mots, decks, traductions. Statiques entre deux releases.
2. **Données utilisateur** : progression, état SRS, sessions de travail. Mutables, par appareil, synchronisées best-effort.

Ces données doivent :

- Être **versionnées** : on doit pouvoir faire évoluer le schéma sans tout casser.
- Être **validées strictement** à l'entrée (lecture d'un JSON, payload d'API).
- **Survivre aux migrations** : un utilisateur qui ouvre l'app après une mise à jour ne doit jamais perdre sa progression.
- Être **partagées entre front et back** avec une source de vérité unique.

## Décision

### Source de vérité unique : JSON Schema

Le **JSON Schema officiel** vit dans `shared/schema/data-schema.v1.json`. C'est la **seule** source de vérité du format des données. À partir de lui :

- Les **types TypeScript** côté front sont écrits manuellement (et validés par Zod, voir plus bas) ou générés.
- Les **structs Go** côté back sont écrites manuellement.
- Les **validateurs Zod** sont écrits manuellement et testés sur fixtures.

Toute évolution du schéma se fait dans ce fichier d'abord, puis répercutée des deux côtés.

### Schéma v1.0.0 — données de référence

```json
{
  "schema_version": "1.0.0",
  "characters": [
    {
      "id": "char_4F60",
      "hanzi": "你",
      "pinyin": [{ "syllable": "nǐ", "tone": 3 }],
      "translations": { "fr": ["tu", "toi"], "en": ["you"] },
      "hsk_level": 1,
      "stroke_count": 7,
      "radicals": ["亻", "尔"],
      "frequency_rank": 8,
      "tags": [],
      "stroke_data_ref": "makemeahanzi:4F60",
      "metadata": {}
    }
  ],
  "words": [
    {
      "id": "word_nihao",
      "hanzi": "你好",
      "pinyin": [
        { "syllable": "nǐ", "tone": 3 },
        { "syllable": "hǎo", "tone": 3 }
      ],
      "translations": { "fr": ["bonjour"], "en": ["hello"] },
      "hsk_level": 1,
      "character_refs": ["char_4F60", "char_597D"],
      "examples": [],
      "tags": [],
      "metadata": {}
    }
  ],
  "decks": [
    {
      "id": "deck_hsk1",
      "name": "HSK 1",
      "description": "Vocabulaire HSK niveau 1",
      "items": [
        { "type": "character", "ref": "char_4F60" },
        { "type": "word", "ref": "word_nihao" }
      ]
    }
  ]
}
```

### Schéma v1.0.0 — données utilisateur (séparées)

```json
{
  "schema_version": "1.0.0",
  "profile_id": "default",
  "progress": [
    {
      "ref": { "type": "character", "id": "char_4F60" },
      "srs_state": { "interval_days": 4, "ease": 2.5, "due": "2026-05-28" },
      "stats": { "attempts": 12, "successes": 10, "last_seen": "2026-05-24" }
    }
  ],
  "sessions": [
    { "id": "sess_...", "started_at": "...", "ended_at": "...", "items_practiced": [] }
  ]
}
```

### Choix de design clés

- **`schema_version` au top niveau** : permet à l'orchestrateur de migrations de détecter et migrer sans ambiguïté.
- **`metadata: {}` générique** sur chaque entité : extensible sans casser le schéma (champs futurs non normés).
- **`tags: []`** : classification libre.
- **`stroke_data_ref`** (référence externe, format `"makemeahanzi:4F60"`) plutôt que tracés inlinés : garde le JSON léger, découple la source des tracés. Le frontend résout la référence via un service dédié.
- **`pinyin` structuré** (syllabe + ton numérique) : permet le tri, la coloration des tons, l'export propre.
- **`translations` indexé par langue** (`fr`, `en`, …) plutôt que `translations_fr` / `translations_en` : extensible sans changement de schéma.
- **`id` préfixé** (`char_`, `word_`, `deck_`) : évite les collisions, lisibilité immédiate.
- **Données de référence et données utilisateur séparées** : la référence est en lecture seule et bundlée au build (cf. RFC 0006), l'utilisateur vit dans IndexedDB et est synchronisée.

### Versioning : SemVer strict

| Bump  | Sens                                                                       | Migration ? |
|-------|----------------------------------------------------------------------------|-------------|
| **PATCH** (1.0.0 → 1.0.1) | Aucun changement structurel (correction de données seulement).             | Non         |
| **MINOR** (1.0.0 → 1.1.0) | Ajout de champs **optionnels** ou d'entités. **Rétrocompatible obligatoirement**. | Non requise |
| **MAJOR** (1.0.0 → 2.0.0) | Changement cassant (suppression, renommage, changement de type).            | **Oui, explicite** |

**Discipline** : on ne supprime jamais et on ne renomme jamais en MINOR. Si le besoin se présente, on bascule en MAJOR avec migration. Pas de demi-mesure.

### Système de migrations de données (côté front)

- Dossier `frontend/src/domain/migrations/`.
- Une migration = un fichier exportant `{ from: SemVer, to: SemVer, migrate(oldData) -> newData }`.
- Au chargement de l'app :
  1. Détection de la version locale en lisant `schema_version`.
  2. Application **en chaîne** des migrations nécessaires (1.0 → 1.1 → 2.0 → 2.1, etc.).
  3. Sauvegarde du résultat avec la nouvelle version.
- **Backup de l'ancien format** dans une clé séparée d'IndexedDB **avant migration**. Garde-fou contre les régressions.
- **Tests obligatoires** pour chaque migration : fixture `v_n` → vérification `v_n+1`.

### Système de migrations (côté back)

- Migrations SQL séparées et indépendantes via **goose** (`backend/internal/migrations/`).
- Versionnées par horodatage incrémental.
- Appliquées au démarrage du serveur (et idempotentes).
- Le versioning SQL et le versioning du JSON Schema **n'ont pas à être alignés** : ils servent des artefacts différents.

### Validation aux frontières

- Côté front : **Zod** valide tout ce qui rentre dans le domaine (JSON HSK bundlé, payloads API). Une erreur de validation = on n'avale pas la donnée.
- Côté back : validation manuelle ou via une lib (à décider au Lot 3 quand l'API est introduite).

## Conséquences

- **Coût** : maintenir trois représentations cohérentes (JSON Schema, types TS, structs Go). Modeste car le schéma évolue lentement.
- **Bénéfice** : on peut faire évoluer le schéma sereinement, avec une discipline claire. Aucune perte de données possible si on respecte la procédure (backup + tests de migration).
- **Le `metadata: {}`** est un échappatoire utile pour expérimenter sans bumper en MAJOR. À ne pas abuser : si un champ devient stable, il sort de `metadata` et entre dans le schéma officiel (en MINOR).

## Alternatives considérées

- **Protobuf** comme source de vérité partagée : refusé. Overkill pour un projet web mono-utilisateur, complexifie le build, n'apporte rien que le JSON Schema ne couvre déjà.
- **Pas de versioning explicite** ("on cassera quand on en aura besoin") : refusé. Premier vrai casse-tête garanti dans six mois.
- **Migrations bidirectionnelles** (rollback) : refusé pour le front (on a le backup à la place). Acceptable côté back via goose si jamais utile.
- **Fusionner données de référence et données utilisateur dans un seul fichier** : refusé. Les cycles de vie sont totalement différents (la référence est livrée par le build, l'utilisateur évolue à chaque session).
