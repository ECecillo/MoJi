# RFC 0007 — Découpage en lots

- **Statut** : Accepté
- **Date** : 2026-05-24
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0001 (vision), RFC 0003 (hexagonale), RFC 0006 (offline)

## Contexte

Le projet est ambitieux pour un mono-développeur sur du temps libre. Le risque principal est d'entamer plusieurs chantiers en parallèle, de ne rien finir, et de se décourager.

D'où la décision de **découper en lots** livrables et utilisables indépendamment, avec un ordre clair. Un lot livre une valeur d'usage tangible (à l'exception du Lot 0 qui est de la plomberie). On ne saute pas un lot, on ne mélange pas deux lots.

## Décision

### Lot 0 — Fondations *(en cours)*

Mise en place de la plomberie. Aucune logique métier.

- Repo, structure du monorepo.
- Documentation (RFC, journal, CURRENT_STATE.md, CLAUDE.md, README.md).
- Stack frontend : Vite, React, TS strict, Tailwind, ESLint, Prettier, Vitest, i18next.
- Stack backend : Go, chi, SQLite, goose, golangci-lint, testify.
- Architecture hexagonale en place côté front et back, dossiers vides prêts.
- Schéma de données v1.0.0 dans `shared/schema/data-schema.v1.json` + fixture d'exemple.
- Types TS + validateurs Zod sur le schéma, **avec tests unitaires sur fixtures**.
- Squelette du système de migrations (orchestrateur + dossier + README).
- Premier endpoint `/health` côté back, testé en TDD.
- Composant "Hello" trivial côté front avec toggle FR/EN, testé.
- `make dev`, `make lint`, `make test` fonctionnels à la racine.

**Critère de sortie** : `make dev` lance front et back, `make test` passe vert des deux côtés, la doc est complète et `CURRENT_STATE.md` indique "Lot 0 terminé".

### Lot 1 — Canvas et validation de tracé

Fonctionnalité centrale du projet.

- Intégration de **Hanzi Writer** derrière l'abstraction `CharacterRenderer`.
- Gestion du **stylet via Pointer Events** (pression, inclinaison).
- **Grilles d'aide** : Tian Zi Ge, Mi Zi Ge, Hui Zi Ge (toggle).
- **Modes d'affichage** : modèle semi-transparent (guide) ou caché (test).
- **Validation de l'ordre et de la direction des traits**.
- UX e-ink-aware : noir/blanc, pas d'animations gratuites, redraw minimisé.
- Import du JSON HSK bundlé (Option B, cf. RFC 0006).

**Critère de sortie** : sur la Boox, on peut choisir un caractère HSK 1, le tracer au stylet, et obtenir une validation immédiate de l'ordre des traits.

### Lot 2 — Glossaire

Navigation et consultation.

- Liste de tous les caractères et mots HSK 1.
- Recherche par pinyin, hanzi, traduction (fr / en).
- Filtres : statut d'apprentissage, tags, plage de fréquence.
- Lien direct depuis le glossaire vers le canvas de tracé.
- Outil d'édition des **traductions françaises** (saisie manuelle progressive).

**Critère de sortie** : on peut feuilleter le HSK 1, chercher un mot, et lancer le tracé en un clic.

### Lot 3 — Système de révision

Mémorisation à long terme.

- Algorithme **SM-2** (~100 lignes, suffisant pour mono-utilisateur).
- Tracking de progression dans `ProgressRepository` (IndexedDB).
- Files de révision (dûs, nouveaux, en cours).
- Première itération de **synchronisation backend** : le serveur Go stocke la progression, sync best-effort au focus.
- API REST minimale côté back, accédée via `RestApiClient` (port `DataSource` / nouveau port `SyncClient`).

**Critère de sortie** : on peut faire une session de révision quotidienne, et retrouver sa progression sur un autre appareil après sync.

### Lot 4 — Synthèse vocale

Audio.

- Intégration de l'API navigateur `SpeechSynthesis`.
- Paramétrage : voix, vitesse, tonalité.
- Bouton "écouter" sur chaque caractère et mot dans le canvas et le glossaire.
- Lecture automatique optionnelle (révision en mode "écoute").

**Critère de sortie** : on entend la prononciation correcte d'un caractère ou d'un mot en un clic, avec une voix chinoise disponible sur le navigateur cible.

### Lot 5 — Polish et PWA offline complète

Finition.

- Service worker robuste (cache-first assets, network-first API).
- Manifest PWA, installabilité, icônes adaptées e-ink.
- Mode hors-ligne complet (zéro requête réseau au runtime nominal).
- Import HSK 2 (extension du jeu de données).
- Audit accessibilité (`prefers-reduced-motion`, `prefers-contrast`, navigation clavier).
- Performance : audit Lighthouse, optimisation des assets.

**Critère de sortie** : l'app est installable sur Boox et ordinateur, fonctionne 100 % offline, et passe un audit Lighthouse acceptable.

### Ce qui suit (post-MVP)

- Bascule des données de référence vers l'Option A (servies par le backend).
- Export / import de decks Anki.
- Statistiques avancées (heatmap, courbes de rétention).
- HSK 3, HSK 4, etc.
- Docker / CI / déploiement formalisé.

## Conséquences

- **Pas de scope creep** entre lots. Si une idée nouvelle apparaît, elle va dans un futur lot ou dans la section post-MVP.
- **Chaque lot est livrable individuellement**. À la fin du Lot 1, on a déjà un outil utilisable (tracé seul). À la fin du Lot 2, on a tracé + glossaire. Et ainsi de suite.
- **Le Lot 0 ne livre pas de valeur d'usage** mais conditionne toute la suite. On ne le bâcle pas.
- **Discipline** : un lot se termine officiellement quand son critère de sortie est atteint, son entrée de journal est écrite, et `CURRENT_STATE.md` est mis à jour.

## Alternatives considérées

- **MVP "tout en un coup"** : refusé. Risque d'abandon élevé, et l'expérience montre qu'on a toujours sous-estimé l'effort.
- **Découpage par tech (front d'abord, back ensuite)** : refusé. Briserait la valeur d'usage progressive. Le découpage par feature force à finir chaque feature de bout en bout.
- **Commencer par le SRS** : refusé. Le SRS sans canvas n'a aucun intérêt produit ; le canvas seul est déjà utile.
- **Sauter le Lot 0** ("on documentera plus tard") : refusé. La discipline doc/architecture est moins coûteuse à installer dès le début qu'à rétablir après coup.
