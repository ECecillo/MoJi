# 2026-06-13 — Lot 5 : optimisation des assets Hanzi Writer

## Objectif de la session

Traiter l'axe d'optimisation identifié au démarrage du Lot 5 : le build embarquait
l'intégralité de `hanzi-writer-data` (~9 600 fichiers JSON, soit un caractère par
glyphe existant) alors que HSK 1 n'en utilise que 300. Conséquence directe : un
service worker dont le manifeste de précache pesait ~260 KB et un chunk principal
de ~1,5 MB.

## Ce qui a été fait

- **Pipeline de données étendu** (`frontend/scripts/build-hsk1-data.ts`) : après la
  génération de `hsk1.generated.json`, le script extrait depuis le paquet npm pinné
  `hanzi-writer-data` les seules données de tracé des 300 caractères HSK 1 et les
  écrit, minifiées, dans un fichier généré unique `hsk1-stroke-data.generated.json`
  (map `hanzi → { strokes, medians }`). Échec dur si un caractère manque ou si ses
  données sont malformées : aucun fichier n'est écrit (cf. RFC 0008).
- **Renderer simplifié** (`HanziWriterRenderer.ts`) : `loadBundledHanziWriterData`
  ne globe plus `node_modules/hanzi-writer-data/*.json`. Il charge le fichier généré
  unique en **import dynamique paresseux** (un seul chunk, mémoïsé), puis indexe par
  hanzi. Comportement public inchangé (même signature, même erreur si absent).
- **Test d'intégrité** (`hsk1-stroke-data.generated.test.ts`) : couverture exacte des
  300 caractères (ni manquant, ni surnuméraire), traits non vides et `medians`
  alignées sur `strokes`, spot-check sur 你 (7 traits). C'est le filet qui
  détecterait une régression du pipeline.

## Gain mesuré (build production)

| Métrique                     | Avant      | Après          |
|------------------------------|------------|----------------|
| Modules transformés          | ~9 600     | **93**         |
| `dist/sw.js` (précache)       | ~260 KB    | **2,25 KB**    |
| Chunk principal JS           | ~1,5 MB    | **573 KB** (gzip 150 KB) |
| Données de tracé             | ~9 600 chunks | **1 chunk paresseux** (618 KB / gzip 253 KB) |

Les données restent intégralement disponibles hors-ligne : le chunk paresseux unique
est chargé au premier tracé puis mis en cache par le service worker (une entrée de
précache au lieu de ~9 600).

## Découvertes / surprises

- **Décalage de version Node.** En lançant `make test` dans un shell utilisant le Node
  système (v25.0.0), **46 tests échouaient** sur `window.localStorage.clear is not a
  function` : sous Node 25, le `localStorage` exposé par jsdom@25.0.1 n'est pas un vrai
  `Storage`. `mise.toml` épingle **Node 24.15.0** ; sous cette version, **220/220 tests
  passent**. La config mise n'était pas « trusted » localement (`mise trust` + `mise
  install node@24.15.0`), donc le Node épinglé n'était pas utilisé. **Rien à corriger
  côté code** : il faut lancer les commandes via la toolchain mise.

## Vérifications

Toutes lancées sous le Node épinglé (`mise exec node@24.15.0 -- …`) :

- `make test` : 220 tests front + backend `-race` OK.
- `make lint` : ESLint + Prettier + golangci-lint, 0 issue.
- `make typecheck` : `tsc --noEmit` propre.
- `make build` : 93 modules transformés, `sw.js` 2,25 KB, chunk principal 573 KB.
- `make test-e2e` : 28/28 Chromium, dont le flux de tracé réel qui consomme le
  nouveau fichier généré.

## Décisions prises

- **Sous-ensemble de tracés généré hors-ligne, pas globé au build.** Le pipeline de
  données (RFC 0008) est la source de vérité : il produit un fichier unique restreint à
  HSK 1 depuis le paquet npm pinné, validé durement. Aucune dépendance PWA externe.
- **Fichier de tracés minifié et chargé en import dynamique paresseux.** Données
  purement machine (chemins SVG) → pas de pretty-print. Chargement paresseux → hors du
  bundle principal, une seule entrée de précache service worker.

## Reste à faire / prochaines étapes (Lot 5)

- Traiter le chunk principal restant (573 KB) : code-splitting de Hanzi Writer / app.
- Icônes PNG 192/512 si l'audit Boox/Chrome les exige.
- Audit Lighthouse sur build de production.
- Test d'installation réel sur Boox Air 5c (nécessite le matériel).
