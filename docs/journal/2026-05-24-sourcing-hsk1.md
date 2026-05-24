# 2026-05-24 — Sourcing et bundling des données HSK 3.0 niveau 1

## Objectif de la session

Première brique du Lot 1 : identifier des sources publiques fiables pour la liste HSK 3.0 niveau 1, les vendoriser dans le repo, écrire un pipeline TS qui produit un JSON conforme au schéma v1, valider la sortie avec Zod, ajouter des tests.

## Ce qui a été fait

### Recherche et choix des sources
- Cartographie de l'écosystème HSK 3.0 sur GitHub : drkameleon, ivankra, krmanik, tonghuikang, nicolas-jaussaud, plaktos, LiudmilaLV, clem109.
- Mesures sur le fichier `wordlists/inclusive/new/1.json` de drkameleon : **506 entrées**, **300 hanzi distincts** — colle exactement au brief.
- Choix actés dans la nouvelle **[RFC 0008](../rfc/0008-sourcing-hsk1.md)** :
  - **drkameleon/complete-hsk-vocabulary** (MIT) comme source principale (vocabulaire + traductions EN + pinyin diacritique/numérique).
  - **skishore/makemeahanzi** (Arphic + Unihan/CJKlib) pour `stroke_count`, `radical`, `decomposition`.
  - Pinning par SHA upstream (drkameleon `7ac65bf`, makemeahanzi `bddc96d4`).

### Vendoring
- `shared/data/sources/drkameleon-hsk30-l1.json` — copie verbatim (482 KB).
- `shared/data/sources/makemeahanzi-hsk1-meta.jsonl` — sous-ensemble dérivé (300 lignes, ~45 KB) : `{character, hex, stroke_count, radical, decomposition, definition, pinyin}`.
- `shared/data/sources/_provenance.json` — URL, SHA upstream, SHA-256 + tailles des fichiers vendorés, date.
- `shared/data/sources/README.md` — règles.
- Script `frontend/scripts/vendor-sources.ts` : fetch les fichiers upstream (~30 MB graphics.txt + 2.5 MB dictionary.txt + 480 KB drkameleon) et produit le sous-ensemble. À ne rejouer que pour un bump de SHA.

### Pipeline de génération
- `frontend/scripts/build-hsk1-data.ts` : lit les sources vendorées, transforme au format schéma v1, valide via les schémas Zod existants du domaine, écrit `frontend/src/data/hsk1.generated.json` (471 KB).
- Choix de mapping pinyin : on conserve la **diacritique** comme syllable et on extrait le ton du **numeric** de drkameleon. Pour les polyphones, on collecte toutes les lectures distinctes apparaissant dans n'importe quelle entrée.
- Décomposition IDS → feuilles : on retire les opérateurs IDS (U+2FF0..U+2FFF) et les placeholders `？`. Si le résultat est vide (caractère atomique comme 一), fallback sur `[radical]` puis `[character]`.
- Fallback de traduction EN : (1) `meanings` de drkameleon si entrée mono-caractère, sinon (2) `definition` de makemeahanzi, sinon (3) placeholder explicite. **Tous les 300 caractères ont une traduction EN non vide** au final.
- IDs : `char_<HEX>` (uppercase) pour les caractères, `word_<concat hex lowercase>` pour les mots, `deck_<slug>` pour les decks.
- Deux decks générés : `deck_hsk1_words` (506 items) et `deck_hsk1_characters` (300 items).

### Tests
- `frontend/src/data/hsk1.generated.test.ts` : **18 nouveaux tests** Vitest sur l'intégrité du JSON généré.
  - Conformité au schéma Zod v1.
  - Comptes : exactement 300 caractères distincts, 506 mots (avec une fourchette de tolérance 500–520), 2 decks aux IDs corrects.
  - Intégrité référentielle : unicité des IDs caractères/mots, chaque `character_refs` pointe vers un caractère existant, chaque deck item pointe vers une entité connue.
  - Métier : tous `hsk_level=1`, `stroke_count ≥ 1`, format `stroke_data_ref`, au moins une lecture pinyin, au moins une traduction EN non vide.
  - Spot-check sur 你 : id `char_4F60`, 7 traits, lecture `nǐ` ton 3, contient le radical `亻`.
- Tests totaux : **42 verts** (24 ex-Lot 0 + 18 nouveaux).

### Outillage
- `tsx` ajouté en devDependency pour lancer les scripts TS directement.
- Override ESLint pour `scripts/` (env Node, désactive `no-restricted-imports` car les scripts vivent hors de la frontière hexagonale).
- `.prettierignore` : exclusion des sources vendorées et des `*.generated.json`.
- Nouvelles cibles Makefile racine : `make vendor-sources`, `make build-data`.
- Scripts npm : `vendor:sources`, `build:data`.

## Découvertes / surprises

- **`你好` est absent de HSK 3.0 niveau 1.** Surprise au moment du spot-check. Vérifié sur la source brute drkameleon : 你好, 您好, 早上好 ne sont pas dans la liste, alors que 再见 et 不客气 le sont. Conforme à la spec HSK 3.0 2021 (les expressions figées comme 你好 ne font pas partie du vocabulaire à mémoriser ; on les considère acquises culturellement). Le user pourra ajouter une liste supplémentaire de "phrases utiles" hors HSK plus tard si souhaité.
- **88 caractères apparaissent uniquement dans des mots composés** (300 − 212 mono-entrées), donc sans `meanings` drkameleon ; le fallback sur makemeahanzi `definition` couvre tous les cas.
- **Le `？` (U+FF1F) dans une `decomposition` makemeahanzi** signale une décomposition inconnue (ex. 一). Heureusement déjà géré par le fallback radical → character.
- **Bug de doublon `overrides` dans `.eslintrc.cjs`** au moment de l'ajout des règles `scripts/` : la deuxième clé écrasait silencieusement la première (perte des overrides existants sur `adapters/`, `features/`, tests). Détecté et fusionné en un seul bloc.
- **Erreur Prettier sur les scripts** au premier passage (formatage automatique imposé) : rattrapé via `npm run lint:fix`.

## Décisions prises

- [RFC 0008 — Sourcing des données HSK 3.0 niveau 1](../rfc/0008-sourcing-hsk1.md).

## Reste à faire / prochaines étapes

- Commits thématiques de la session (RFC + sources vendorées + pipeline + tests + makefile + doc).
- Lot 1 — étapes restantes :
  - Adapter `BundledDataSource` (port `DataSource`) qui consomme `hsk1.generated.json`.
  - Intégration de Hanzi Writer via l'adapter `HanziWriterRenderer` (port `CharacterRenderer`).
  - Capture stylet via Pointer Events.
  - Grilles d'aide Tian/Mi/Hui Zi Ge.
  - Modes d'affichage transparent/caché.
  - UX e-ink.
- À considérer plus tard :
  - Enrichissement progressif des traductions françaises (Lot 2, glossaire).
  - Liste supplémentaire de phrases hors HSK (你好, 您好, 早上好…) si l'usage l'exige.
  - Ajout de CC-CEDICT pour des glosses plus riches si besoin.
