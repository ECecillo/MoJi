# RFC 0008 — Sourcing des données HSK 3.0 niveau 1

- **Statut** : Accepté
- **Date** : 2026-05-24
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0002 (stack), RFC 0004 (format de données), RFC 0006 (offline-first)

## Contexte

Le brief (section 7, Lot 1) prévoit l'intégration de la liste HSK 3.0 niveau 1 — **300 caractères distincts** dans **~500 entrées de vocabulaire** (caractères mono-syllabe + mots composés). Le brief reporte explicitement (section 10) le sourcing au début du Lot 1.

Trois choix structurants en découlent :

1. **Quelle(s) source(s)** publiques utiliser ?
2. Comment **figer** ces sources pour garantir des builds reproductibles offline ?
3. **Où vit** le pipeline qui transforme ces sources brutes en un JSON conforme au schéma v1 (cf. RFC 0004) ?

## Décision

### 1. Sources upstream

| Rôle                                                            | Source                                                                                            | Licence                                                | Pinné au commit                                  |
|-----------------------------------------------------------------|---------------------------------------------------------------------------------------------------|--------------------------------------------------------|--------------------------------------------------|
| Liste HSK 3.0 niveau 1 (vocabulaire + traductions EN + pinyin)  | [`drkameleon/complete-hsk-vocabulary`](https://github.com/drkameleon/complete-hsk-vocabulary), fichier `wordlists/inclusive/new/1.json` | **MIT**                                                | `7ac65bf1a6387d35f1ade478906172a19311c7f9` (2026-03-23) |
| Métadonnées par caractère (nombre de traits, radical, décomposition) | [`skishore/makemeahanzi`](https://github.com/skishore/makemeahanzi), fichiers `dictionary.txt` + `graphics.txt` | **Arphic fonts** (graphics) + **Unihan/CJKlib** (dictionary) — permissif | `bddc96d41bef78427ed0e034e9f7e31d71fd1b92` (2026-03-08) |

**Pourquoi drkameleon** :
- Fichier dédié HSK 3.0 niveau 1 (`1.json`, 495 KB), pas un blob global à filtrer.
- 506 entrées correspondant exactement à la spec HSK 3.0 band 1 ; couvrent **300 hanzi distincts** (vérifié par script avant adoption).
- Schéma riche : pinyin (avec et sans tons), traditional, POS, frequency rank, **`meanings` en anglais** pour chaque entrée — pas besoin de CC-CEDICT au MVP.
- Licence MIT, repo actif (mises à jour automatisées).

**Pourquoi makemeahanzi** :
- Déjà acté par la RFC 0002 pour fournir les chemins SVG des tracés. On en réutilise les métadonnées par caractère.
- `dictionary.txt` (JSONL) fournit `radical`, `decomposition` (notation IDS) pour 9574 caractères.
- `graphics.txt` (JSONL) fournit `strokes` (chemins SVG) ; sa longueur donne le `stroke_count`.

### 2. Vendoring

Les sources sont **vendorées** dans `shared/data/sources/` :

- `drkameleon-hsk30-l1.json` — copie verbatim du fichier amont (~495 KB).
- `makemeahanzi-hsk1-meta.jsonl` — **sous-ensemble dérivé** : une ligne JSON par hanzi HSK 1, contenant `{character, hex, stroke_count, radical, decomposition}` (~30 KB).
- `_provenance.json` — URLs, SHA upstream, dates, hashs SHA-256 des fichiers vendorés. Source de vérité pour la traçabilité.
- `README.md` — procédure de mise à jour.

**Pourquoi vendorer** :
- **Reproductibilité** : un `git checkout` à n'importe quel commit reproduit exactement les builds de l'époque, même si l'upstream change ou disparaît.
- **Builds offline** : aucun appel réseau pendant `make build` ou `make build-data`. Cohérent avec la RFC 0006.
- **Pinning par SHA upstream** : on sait exactement quelle version de la liste HSK 1 on utilise.

**Mise à jour** : un script dédié `frontend/scripts/vendor-sources.ts` re-fetche depuis les URL pinnées, recalcule le sous-ensemble dérivé et met à jour les fichiers + `_provenance.json`. Une mise à jour de SHA = un commit explicite, jamais silencieux.

### 3. Pipeline de génération

Le pipeline vit dans **`frontend/scripts/`** (cf. RFC 0003, on assume cette responsabilité côté front car la sortie est un asset front) :

- `frontend/scripts/vendor-sources.ts` — bootstrap / mise à jour du vendoring (re-fetch + recalcul du sous-ensemble + provenance).
- `frontend/scripts/build-hsk1-data.ts` — lit les sources vendorées, transforme au format schéma v1, valide avec les schémas Zod existants (`src/domain/schema/validators.ts`), écrit la sortie.

**Sortie** : `frontend/src/data/hsk1.generated.json`, **commitée** au repo. C'est elle qui sera consommée par `BundledDataSource` au Lot 1.

**Scripts npm** :

- `npm run vendor:sources` — rejoue le vendoring depuis l'upstream (rare).
- `npm run build:data` — régénère `hsk1.generated.json` à partir des sources vendorées (à chaque évolution du schéma ou des sources vendorées).

**Pourquoi pas dans `tools/data-pipeline/` standalone ou côté Go** :
- Standalone : dédoublerait l'écosystème TS + les types/Zod, sans bénéfice.
- Côté Go : obligerait à dupliquer la validation Zod en validation Go, pour produire un fichier qui ne profite qu'au front.

### 4. Mapping `drkameleon → schéma v1`

| Schéma v1                         | Drkameleon                          | makemeahanzi (subset)                            |
|-----------------------------------|-------------------------------------|--------------------------------------------------|
| `character.id`                    | `"char_" + hex(codepoint)`          |                                                  |
| `character.hanzi`                 | hanzi (issu de `simplified`)        |                                                  |
| `character.pinyin[].syllable`     | `forms[0].transcriptions.pinyin`    |                                                  |
| `character.pinyin[].tone`         | dérivé de `transcriptions.numeric` (chiffre final, 0 si neutre) |                                                  |
| `character.translations.en`       | `forms[0].meanings` (1ère forme)    |                                                  |
| `character.translations.fr`       | **vide au MVP** (rempli à la main progressivement) |                                                  |
| `character.hsk_level`             | `1` (constant, c'est le niveau)     |                                                  |
| `character.stroke_count`          |                                     | `len(strokes)` depuis `graphics.txt`             |
| `character.radicals`              |                                     | feuilles non-IDS de `decomposition` (≥ 1 char)   |
| `character.frequency_rank`        | `frequency` (entier)                |                                                  |
| `character.stroke_data_ref`       | `"makemeahanzi:" + hex(codepoint)`  |                                                  |
| `character.metadata`              | `{}` (réservé)                      |                                                  |
| `word.*`                          | mêmes règles, `character_refs` = `[char_HEX...]` pour chaque hanzi de `simplified` |                                                  |

**Cas limite** : les 212 entrées drkameleon mono-caractère sont **à la fois** un `character` (entité d'apprentissage du tracé) et un `word` (entité de vocabulaire). Elles vivent donc dans les deux arrays — cohérent avec le schéma. Les 88 caractères restants (300 − 212) n'apparaissent qu'inside des mots composés et ne sont présents que dans `characters[]`.

### 5. Decks

Deux decks générés par le pipeline :

- `deck_hsk1_words` — les 506 entrées de vocabulaire (drkameleon).
- `deck_hsk1_characters` — les 300 caractères distincts (utile pour drill de tracé).

## Conséquences

- **Bénéfice immédiat** : `hsk1.generated.json` est disponible offline dès le démarrage du Lot 1. La feature canvas peut directement piocher dans la liste.
- **Coût initial** : ~525 KB de fichiers vendorés dans `shared/data/sources/` + ~150 KB de JSON généré dans `frontend/src/data/`. Acceptable.
- **Engagement** : à chaque rafraîchissement des sources, on bump les SHA pinnés dans le code du vendoring + on rejoue `npm run vendor:sources` + on relit `_provenance.json` + on commit. Discipline équivalente à un upgrade de dépendance.
- **Traductions françaises** : volontairement vides au démarrage. Le Lot 2 (glossaire) introduira un outil de saisie. Aucune contrainte sur quand/où elles sont remplies.

## Alternatives considérées

- **CC-CEDICT comme source des définitions** : refusé pour le MVP. drkameleon contient déjà des `meanings` lisibles et concis ; CC-CEDICT alourdirait pour rien. Reste utilisable plus tard si besoin (CC BY-SA 4.0).
- **`ivankra/hsk30`** comme source principale : refusé. Pas de glose anglaise dans le CSV (il faudrait joindre avec CC-CEDICT), augmente la complexité du pipeline sans bénéfice immédiat.
- **`krmanik/HSK-3.0`** : refusé. Format texte non structuré, parser fragile.
- **Refetch à chaque build** au lieu de vendoring : refusé. Casse l'offline-first, fragile (un repo amont qui disparaît ou bouge casse les builds historiques).
- **Pipeline en Go côté back** : refusé. Duplique la validation Zod, fait porter une responsabilité front au back.
- **Stocker les chemins SVG (`strokes`)** dans `hsk1.generated.json` : refusé. ~30 MB de paths inutiles pour le canvas (Hanzi Writer charge ses données côté runtime). On conserve `stroke_data_ref` comme indirection.
