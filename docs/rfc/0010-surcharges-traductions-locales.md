# RFC 0010 — Surcharges de traductions locales (éditeur FR)

- **Statut** : Accepté
- **Date** : 2026-05-30
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0003 (hexagonale), RFC 0004 (format de données et versioning), RFC 0006 (offline-first), RFC 0007 (découpage en lots — clôture du Lot 2)

## Contexte

Le bundle HSK 1 sourcé via `make build-data` n'inclut que des traductions `en` (cf. RFC 0008). Le critère de sortie du Lot 2 (cf. RFC 0007) mentionne explicitement un **"outil d'édition des traductions françaises (saisie manuelle progressive)"**. Il faut donc un mécanisme qui permette à l'utilisateur de saisir ses propres traductions, sans toucher aux fichiers générés ni rendre le projet hostile à une re-génération `make build-data`.

L'app est mono-utilisateur, offline-first, installable en PWA. Le volume de données est petit (HSK 1 ≈ 800 entrées, quelques chaînes par entrée). Pas de synchronisation multi-appareils dans le périmètre du Lot 2.

## Décision

### 1. Modèle de données

Une **surcharge** est attachée à un `entryId` (préfixe `char_` ou `word_`, identique à l'ID du bundle) et à une langue ISO 639-1. La surcharge contient la liste complète des traductions que l'utilisateur veut voir pour cette langue.

```ts
// Map indexée par id d'entrée
type OverrideMap = Record<EntryId, Record<LanguageCode, string[]>>;
```

Sémantique du merge (`mergeTranslations`) :

- Pour chaque langue présente dans l'override, la liste **remplace intégralement** celle du bundle. L'utilisateur veut contrôler exactement ce qui s'affiche en FR, pas voir s'empiler ses traductions à côté des sens upstream.
- Pour les langues absentes de l'override, la liste du bundle est gardée telle quelle.
- Une liste vide dans l'override n'est pas censée être persistée (l'adapter supprime cette clé), mais si elle arrive on retombe sur la valeur bundle (no-op safe).

### 2. Port hexagonal

Un nouveau port `TranslationOverrideRepository` (`src/domain/ports/`) avec 4 méthodes asynchrones :

```ts
loadAll(): Promise<OverrideMap>;
setForLanguage(entryId: EntryId, lang: LanguageCode, items: string[]): Promise<void>;
clearForEntry(entryId: EntryId): Promise<void>;
clearAll(): Promise<void>;
```

Le domaine ne connaît jamais le mécanisme de stockage sous-jacent. Un test peut utiliser une implémentation in-memory triviale.

### 3. Adapter localStorage (initial)

L'adapter `LocalStorageTranslationOverrideRepository` (`src/adapters/storage/`) sérialise un **blob JSON unique** sous la clé `sinogrammes:translation_overrides` :

```json
{
  "schema_version": 1,
  "data": {
    "char_4F60": { "fr": ["tu", "toi"] }
  }
}
```

Choix volontaire d'un blob unique vs "une clé par entrée" :

- Volume petit (≤ 100 Ko à HSK 1 réaliste, marge confortable sur la limite ~5 Mo de localStorage).
- Simplifie l'export / import futur (un seul `JSON.stringify`).
- Permet une migration de schéma propre quand on bumpera (lire l'ancienne version, transformer, écrire la nouvelle).

Le format est validé à la lecture : version absente ou différente → on retourne une map vide plutôt que de crasher. Le contenu utilisateur peut être perdu dans le cas d'un downgrade ou d'une corruption JSON ; ce risque est accepté pour le Lot 2 (offline-first, mono-utilisateur, données reconstructibles à la main). Une migration formelle sera décrite dans une RFC dédiée si la `schema_version` saute.

### 4. UI

Dans `EntryDetail`, chaque section de langue affiche un bouton "Modifier" (ou "Ajouter une traduction" si la langue est absente du bundle). L'éditeur est inline (pas de modale) :

- Liste d'inputs texte avec un `✕` par ligne pour supprimer.
- Bouton `+ Ajouter une traduction` pour étendre la liste.
- Boutons `Enregistrer` / `Annuler` pour valider ou défaire.
- Une fois persistée, la section affiche le marqueur `✎` pour signaler "traduction personnelle".

L'éditeur n'est proposé que pour la langue courante (`i18n.resolvedLanguage`). Permet de garder l'UI simple et focalisée sur le cas usage principal (l'utilisateur en FR édite son FR). Les autres langues restent affichées en lecture seule.

### 5. Propagation à la recherche

`Glossary` consomme le même hook `useTranslationOverrides` et applique `mergeTranslations` à la fois pour l'**affichage** des cartes et pour la **recherche** par traduction. Une fois "tu, toi" enregistré pour `你`, taper "tu" dans la barre de recherche fait remonter `你`.

## Conséquences

- **Pas de RFC ultérieure nécessaire** pour la même fonctionnalité tant que le format `schema_version: 1` tient. Migration = nouvelle RFC + bump.
- **Cohérent avec l'hexagonale** : le port pourra être ré-implémenté côté backend (Lot 3+) sans changer la couche feature. Un futur `RestApiTranslationOverrideRepository` est l'évolution naturelle.
- **Découplé de la régénération `make build-data`** : régénérer le bundle ne touche pas aux surcharges utilisateur, elles vivent dans le navigateur.
- **Pas multi-appareils** : changer d'ordinateur efface les surcharges. C'est explicite et accepté pour le Lot 2 — la sync est le sujet du Lot 3.
- **Compteur de surcharges visible** : le marqueur `✎` permet à l'utilisateur de distinguer ses traductions des traductions bundle, important si on veut un jour purger ses overrides en cas d'erreur.

## Alternatives considérées

- **IndexedDB** : refusé pour le Lot 2. Plus puissant mais plus complexe (transactions, async lourd, debug pénible). Réserver pour le Lot 3 quand on stockera de la progression SRS avec des index par date.
- **Backend Go + nouveau endpoint** : refusé pour le Lot 2. Engagerait des décisions de sync (conflits, offline-first du blob, etc.) qui sortent du périmètre. Sera tranché dans une RFC future quand on aura besoin de multi-appareils.
- **Une clé localStorage par entrée** : refusé. Plus simple à patcher en place mais rend l'export/import et la migration de schéma chiantes. Le blob unique reste petit, la lecture/écriture intégrale n'est pas un problème de perf à notre échelle.
- **Empiler les traductions overridées au-dessus des bundle** : refusé. Ambigu en lecture, perd le contrôle utilisateur (l'utilisateur ne peut pas masquer un sens upstream qu'il trouve imprécis). Le replace intégral est cohérent avec "tu décides de ce qui s'affiche".
- **Édition dans toutes les langues** : refusé. UI plus chargée, sans valeur dans le cas usage principal. Si besoin, on rouvrira par une RFC.
