# 2026-05-28 — Carnet de bord HTML autonome (outillage doc)

## Objectif de la session

Construire un point d'entrée HTML unique (`docs/index.html`) pour consulter facilement, dans un navigateur, l'état du projet, les RFC et le journal. Ancrer dans `CLAUDE.md` la discipline de régénération à chaque modification de markdown.

## Ce qui a été fait

### Script `frontend/scripts/build-docs-index.ts`
- Lecture des sources : `BRIEF.md`, `docs/handoff/CURRENT_STATE.md`, `docs/rfc/*.md` (sauf README), `docs/journal/*.md` (sauf README, tri filename décroissant pour avoir l'entrée la plus récente en premier).
- Extraction de la métadonnée RFC (statut, date) via regex sur les bullets `**Clé** : valeur` du début du fichier.
- Rendu markdown via `marked` v18 (GFM activé) en mode synchrone.
- **Réécriture des liens internes** `*.md` en ancres `#rfc-NNNN`, `#journal-…`, `#etat`, `#brief`. Permet la navigation entre RFC depuis l'intérieur d'une autre RFC sans casser.
- HTML autonome : CSS et JS inlinés, aucune dépendance runtime. S'ouvre directement via `file://`.
- Affichage : nav sticky en haut, sections collapsables via `<details>`, badge de statut coloré pour les RFC (Accepté/Brouillon/Remplacé/Abandonné), tableau d'index des RFC en tête de section, support `prefers-color-scheme: dark`, mode print propre, `prefers-reduced-motion` respecté.
- Petit script JS inline (~10 lignes) qui ouvre automatiquement les `<details>` cibles d'un lien-ancre — un clic sur "cf. RFC 0007" déplie la section correspondante.

### Outillage
- `marked@^18.0.4` ajouté en `devDependency` (uniquement utilisé par le script Node).
- Nouveau script npm `build:docs` (`tsx scripts/build-docs-index.ts`).
- Nouvelle cible `make docs` à la racine, listée dans `make help`.
- `.prettierignore` mis à jour pour exclure `docs/index.html` (généré).

### Discipline ajoutée à `CLAUDE.md`
Trois ajouts cohérents :
1. Section **Commandes utiles** → nouveau bloc "Carnet de bord HTML" avec `make docs` et la mention **"À lancer obligatoirement après toute modification d'un fichier markdown dans `docs/` ou de `BRIEF.md`, avant le commit. L'index HTML est régénéré, jamais édité à la main."**
2. Section **Rythme de travail** → "À chaque fin de session / feature : tenir à jour `CURRENT_STATE.md`, écrire une entrée de journal, **puis lancer `make docs`**". Précision : "La régénération de `docs/index.html` accompagne le commit qui modifie les markdown correspondants — pas dans un commit séparé."
3. Section **Ce que Claude Code ne fait pas** → ajout de `docs/index.html` à la liste des fichiers générés à ne jamais éditer à la main.

## Découvertes / surprises

- **`<details>` et navigation par ancre** : par défaut, cliquer sur un lien vers un id à l'intérieur d'un `<details>` fermé ne le déplie pas. La spec a évolué récemment (`auto-expand details on text fragment`) mais la prise en charge est inégale. Solution : 10 lignes de JS qui remontent l'arbre depuis la cible et passent `open = true` sur tous les ancêtres `<details>`.
- **`marked` v18** retourne par défaut une `Promise<string>`. Pour rester synchrone dans un script de build court, passer l'option `{ async: false }` à `parse()` et caster vers `string`.
- **`prettier --write` du script généré** : Prettier reformate les template literals contenant CSS/JS multilignes. Heureusement de manière idempotente — le HTML produit reste valide.

## Décisions prises

Aucune RFC. Choix d'implémentation :
- **Génération à la demande** plutôt que rendu à la volée côté serveur — cohérent avec l'offline-first du projet, et permet d'ouvrir le carnet sur n'importe quelle machine sans backend.
- **Un seul fichier** plutôt qu'une arbo HTML — plus simple à versionner, à ouvrir, à transporter.
- **`docs/index.html` commité au repo** plutôt que généré-au-build. Trade-off accepté : diff bruyant à chaque modif markdown ; bénéfice : pas besoin d'environnement Node pour consulter.
- **Pipeline TS dans `frontend/scripts/`** plutôt que `scripts/` ou `tools/data-pipeline/` au repo : infrastructure tsx + ESLint + Prettier déjà en place. Le script importe rien du code applicatif front.

## Vérifications

- `make docs` génère `docs/index.html` (~119 KB, 8 RFC + 6 entrées de journal au moment de la première exécution).
- `make test` / `make lint` / `make typecheck` restent verts.

## Reste à faire / prochaines étapes

- À chaque session future, **`make docs`** est obligatoire si un markdown sous `docs/` ou `BRIEF.md` a bougé. Couvert par la discipline dans `CLAUDE.md`.
- Évolutions possibles si le besoin se présente : recherche full-text in-page (Ctrl+F suffit pour l'instant), filtre par statut RFC, accordéon "tout déplier".
