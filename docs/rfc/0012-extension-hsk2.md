# RFC 0012 — Extension du jeu de données à HSK 2

- **Statut** : Accepté
- **Date** : 2026-06-13
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0004 (format de données et versioning), RFC 0007 (découpage en lots — Lot 5), RFC 0008 (sourcing HSK 1)

## Contexte

Le Lot 5 (RFC 0007) prévoit « Import HSK 2 (extension du jeu de données) ». Jusqu'ici
le BRIEF et `CLAUDE.md` cadraient le projet sur **HSK 3.0 niveau 1**. Étendre à HSK 2
est une évolution de périmètre : comme le brief est figé, elle passe par cette RFC.

La même source que pour HSK 1 (`drkameleon/complete-hsk-vocabulary`, RFC 0008) expose
`wordlists/inclusive/new/2.json`. Le dossier `inclusive` est **cumulatif** : `2.json`
(1256 mots) **contient** les 506 mots de `1.json`. `makemeahanzi` et `hanzi-writer-data`
couvrent l'intégralité des caractères concernés (vérifié : 0 manquant sur les 298
caractères HSK 2 exclusifs).

## Décision

### Périmètre

Le projet couvre désormais **HSK 3.0 niveaux 1 et 2** : 598 caractères (300 + 298) et
1256 mots (506 + 750) au total.

### Affectation de niveau

Le niveau d'un mot ou d'un caractère est **le plus bas où il apparaît** (les niveaux
sont donc disjoints à l'émission). Concrètement : ce qui est dans HSK 1 reste HSK 1 ;
HSK 2 ne contient que ses entrées **exclusives**. `hsk_level` est posé en conséquence
(le schéma v1 acceptait déjà 1–9, **aucune migration**).

### Fichiers par niveau + merge au chargement

Plutôt qu'un fichier monolithique, on garde les artefacts HSK 1 **intacts** et on
ajoute des fichiers niveau 2, fusionnés à l'exécution :

- Vendoring (`vendor-sources.ts`) : généralisé sur `LEVELS = [1, 2]`. Sauve
  `drkameleon-hsk30-l{1,2}.json` verbatim et dérive `makemeahanzi-hsk{1,2}-meta.jsonl`
  (chaque meta = caractères **exclusifs** au niveau, par différence ensembliste).
- Build (`build-hsk1-data.ts`) : généralisé par niveau. Émet `hsk{1,2}.generated.json`
  et `hsk{1,2}-stroke-data.generated.json`. Les sorties HSK 1 restent **byte-identiques**.
- Front : `bundledReferenceData.ts` et le loader de tracés de `HanziWriterRenderer`
  importent dynamiquement les deux niveaux et les **fusionnent** (concat / `Object.assign`).
  Chaque niveau reste un **chunk paresseux** séparé (même stratégie de code-splitting que
  HSK 1) — le shell applicatif ne grossit pas. Ajouter HSK 3 = ajouter un import.

### Filtre par niveau dans le glossaire

`GlossaryFilters` gagne `hskLevels?: ReadonlySet<number>` ; le `FilterPanel` expose des
bascules « HSK 1 / HSK 2 ». Indispensable pour garder navigable une liste qui double.

## Conséquences

- Référentiel **inter-fichiers** : un mot HSK 2 peut référencer un caractère HSK 1 (qui
  vit dans `hsk1.generated.json`). L'intégrité est donc vérifiée sur le jeu **fusionné**
  (test dédié), pas par fichier isolé.
- Volume : `hsk2.generated.json` (~290 KB) et `hsk2-stroke-data.generated.json` (~710 KB)
  s'ajoutent en chunks paresseux, précachés par le service worker (offline préservé).
- `CLAUDE.md` mis à jour : « HSK 3.0 niveau 1 » → « niveaux 1–2 ».

## Alternatives considérées

- **Fichier monolithique `hsk.generated.json`** : rejeté. Renommer casserait l'identité
  des artefacts HSK 1 (churn, tests, perte de la garantie byte-identique) sans bénéfice ;
  le merge au chargement est plus simple et extensible.
- **Champ de niveau cumulatif** (HSK 2 ré-émet HSK 1) : rejeté. Duplication, et
  contradiction avec l'affectation « plus bas niveau ».
- **Reporter HSK 2 en post-MVP** : écarté par décision produit (faire l'import maintenant).
