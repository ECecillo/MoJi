# shared/data/sources/

Snapshots **figés par SHA upstream** des sources de données externes utilisées par le pipeline `frontend/scripts/build-hsk1-data.ts`. Cf. [RFC 0008](../../../docs/rfc/0008-sourcing-hsk1.md).

## Contenu

| Fichier                              | Origine                                                                                       | Rôle                                                                       |
|--------------------------------------|-----------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|
| `drkameleon-hsk30-l1.json`           | [drkameleon/complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT) | Vocabulaire HSK 3.0 niveau 1 (506 entrées, 300 hanzi distincts) — verbatim.|
| `makemeahanzi-hsk1-meta.jsonl`       | [skishore/makemeahanzi](https://github.com/skishore/makemeahanzi) (Arphic fonts + Unihan/CJKlib) | Sous-ensemble dérivé : `stroke_count`, `radical`, `decomposition` par hanzi.|
| `_provenance.json`                   | généré                                                                                        | URLs, SHA upstream, SHA-256 des fichiers vendorés, date de génération.     |

## Règles

- Ces fichiers **ne sont jamais édités à la main**.
- Tout rafraîchissement se fait via `npm run vendor:sources` depuis `frontend/`.
- Bumper un SHA upstream = modifier les constantes `DRKAMELEON_SHA` / `MMAH_SHA` dans `frontend/scripts/vendor-sources.ts`, puis rejouer `npm run vendor:sources`, puis committer le résultat.
- Le pipeline `build:data` (cf. `frontend/scripts/build-hsk1-data.ts`) **ne fait aucun appel réseau** ; il ne lit que ce dossier.

## Conformité offline

L'intégralité de la pipeline `vendor:sources` → `build:data` → bundle frontend respecte l'objectif offline-first ([RFC 0006](../../../docs/rfc/0006-pwa-offline-first.md)) : seul `vendor:sources` accède au réseau, et il n'est jamais appelé pendant un build de production.
