# PROJECT_BRIEF — Apprentissage des sinogrammes

> **À lire en premier.** Ce document est le point d'entrée du projet. Il résume **toutes** les décisions prises lors de la phase de cadrage initiale (conversation préalable). Il est destiné à un LLM (Claude Code) ou à un humain qui reprend le projet à zéro.
>
> **Première action attendue après lecture** : créer la structure de documentation (RFC en français, journal, CLAUDE.md, CURRENT_STATE.md) à partir des informations ci-dessous, **avant tout code**. Voir la section "Plan de démarrage" en fin de document.

---

## 1. Vision du projet

Application web personnelle d'apprentissage des sinogrammes (caractères chinois) pour un utilisateur débutant (HSK 3.0 niveau 1). L'usage principal est la **pratique du tracé manuel au stylet sur une tablette e-ink Boox Air 5c**, avec validation de l'ordre et de la direction des traits. Les usages secondaires sont la révision visuelle (sur ordinateur et téléphone) et la consultation d'un glossaire.

Le projet est **mono-utilisateur** (pas d'authentification, à la limite un système de profils local). Il est conçu pour évoluer en plusieurs lots, sans tout livrer d'un coup.

## 2. Périmètre fonctionnel

### Fonctionnalités cibles
1. **Canvas de tracé** avec :
   - Modes d'affichage : sinogramme en semi-transparent (guide), ou caché (test).
   - Grilles d'aide optionnelles : Tian Zi Ge (田字格), Mi Zi Ge (米字格), Hui Zi Ge (回字格).
   - **Validation de l'ordre et de la direction des traits** (fonctionnalité centrale, non négociable).
2. **Révision** type Anki (répétition espacée).
3. **Mode vocal** : prononciation des caractères et mots via synthèse vocale du navigateur (`SpeechSynthesis API`).
4. **Glossaire** consultable de tous les caractères et mots.

### Public et plateformes
- **Tablette Boox Air 5c** : usage principal pour le tracé au stylet Wacom. E-ink couleur, Android, Chromium 111 (mars 2023). Recommandation : installer Chrome depuis le Play Store plutôt que d'utiliser le navigateur natif Boox.
- **Ordinateur de bureau et portable** : usage secondaire, révision et glossaire uniquement (pas de tracé à la souris).
- L'application doit être **installable en PWA** et fonctionner **offline-first**.

### Contraintes liées à l'e-ink
- Refresh rate lent, ghosting marqué.
- Minimalisme visuel obligatoire, animations rares ou désactivables.
- Privilégier `prefers-reduced-motion` et `prefers-contrast` partout.

## 3. Stack technique actée

### Frontend
- **Vite** + **React 18** + **TypeScript** en mode `strict`.
- **Tailwind CSS** pour le styling.
- **Zod** pour la validation runtime du schéma de données.
- **i18next** + **react-i18next** pour l'internationalisation de l'interface.
- **Vitest** + **Testing Library** pour les tests.
- **ESLint** + **Prettier** (configuration stricte).
- **Hanzi Writer** (bibliothèque JS open-source) pour le rendu et la validation des tracés, **derrière une abstraction** permettant de la remplacer.
- **PWA** : service worker + IndexedDB (lots ultérieurs).
- **Pointer Events** (jamais Touch ou Mouse seuls) pour gérer le stylet Wacom avec pression/inclinaison.

### Backend
- **Go 1.22+**.
- **chi** comme routeur HTTP (remplaçable).
- **SQLite** via `modernc.org/sqlite` (pas de cgo, build simplifié).
- **pressly/goose** pour les migrations SQL.
- **golangci-lint** en mode strict.
- **testify** pour la lisibilité des tests.
- **Architecture hexagonale** : `domain/` sans dépendances, `ports/` (interfaces), `adapters/` (HTTP, SQLite).

### Données
- **Source des tracés** : [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) (licence MIT, ~9000 caractères avec chemins SVG par trait et lignes médianes).
- **Source des définitions** : CC-CEDICT (anglais, licence CC BY-SA) au démarrage.
- **Traductions françaises** : ajoutées progressivement à la main par l'utilisateur.
- **Liste HSK** : HSK 3.0 niveau 1 = **300 caractères + 500 mots composés**.

### Hébergement
- VPS personnel déjà disponible pour le backend Go et le service de fichiers.
- Frontend : à déployer sur le même VPS ou ailleurs (à décider plus tard).

## 4. Principes d'architecture

### Hexagonal léger (front et back)
L'utilisateur a explicitement demandé que tout soit **plug-and-play** : pouvoir remplacer Hanzi Writer, changer le protocole de transport, etc. sans gros refacto. L'architecture hexagonale répond précisément à ce besoin.

- **`domain/`** : logique métier pure, aucune dépendance externe.
- **`ports/`** : interfaces définissant les contrats (ex : `CharacterRenderer`, `ProgressRepository`, `DataSource`).
- **`adapters/`** : implémentations concrètes (`HanziWriterRenderer`, `IndexedDBProgressRepository`, `RestApiClient`, etc.).

Changer Hanzi Writer = créer une nouvelle classe dans `adapters/renderer/`. Changer REST pour gRPC = ajouter `adapters/grpc/` côté back. Aucune autre partie du code ne bouge.

### Offline-first
- Toute la logique métier tourne côté client (validation, SRS, glossaire).
- Le backend est un **simple service de persistance et synchronisation**, jamais un point de passage obligé.
- Synchronisation **best-effort** : la Boox peut rester offline plusieurs jours, tout se rattrape au prochain wifi.

### Données de référence : Option B (bundlées au build)
- Pour le MVP : le JSON HSK 3.0 niveau 1 est **bundlé dans le frontend** au build. Ça marche offline dès la première ouverture.
- À terme : migration vers **Option A** (servies par le backend, cachées par le service worker). À planifier mais pas prioritaire.
- Le backend ne gère **que les données utilisateur** (progression, sessions) au démarrage.

### Versioning du schéma de données (SemVer strict)
- **PATCH** : aucun changement structurel.
- **MINOR** : ajout de champs optionnels, ajout d'entités. **Rétrocompatible obligatoirement**.
- **MAJOR** : changement cassant. Nécessite une migration explicite.
- **Discipline** : on ne supprime/renomme jamais en MINOR. Si besoin, on bascule en MAJOR avec migration.

### Système de migrations de données
- Dossier `frontend/src/domain/migrations/` côté front.
- Une migration = un fichier exportant `{ from, to, migrate(oldData) -> newData }`.
- Au chargement de l'app : détection de la version locale → application en chaîne des migrations nécessaires → sauvegarde du résultat.
- **Backup de l'ancien format** dans une clé séparée d'IndexedDB avant migration.
- **Tests obligatoires** pour chaque migration (fixture v_n → vérification v_n+1).
- Côté backend : migrations SQL séparées et indépendantes via goose.

## 5. Schéma de données (v1.0.0)

### Données de référence

```json
{
  "schema_version": "1.0.0",
  "characters": [
    {
      "id": "char_4F60",
      "hanzi": "你",
      "pinyin": [{ "syllable": "nǐ", "tone": 3 }],
      "translations": {
        "fr": ["tu", "toi"],
        "en": ["you"]
      },
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
      "translations": {
        "fr": ["bonjour"],
        "en": ["hello"]
      },
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

### Données utilisateur (séparées)

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
    {
      "id": "sess_...",
      "started_at": "...",
      "ended_at": "...",
      "items_practiced": []
    }
  ]
}
```

### Choix de design clés
- `schema_version` au top niveau pour les migrations.
- `metadata: {}` générique sur chaque entité : permet d'ajouter des champs futurs sans casser le schéma.
- `tags: []` pour classification libre.
- `stroke_data_ref` (référence externe `"makemeahanzi:4F60"`) plutôt que tracés inlinés : garde le JSON léger, découple la source des tracés.
- `pinyin` structuré (syllabe + ton numérique) pour permettre tri, coloration des tons, etc.
- `translations` indexé par langue (`fr`, `en`) plutôt que `translations_fr` : extensible sans changement de schéma.
- `id` préfixé (`char_`, `word_`, `deck_`) pour éviter les collisions.

Le **JSON Schema officiel** vit dans `shared/schema/data-schema.v1.json` et sert de source de vérité unique. Les types TS et structs Go en découlent.

## 6. Internationalisation

Deux dimensions distinctes :

1. **I18n de l'interface** : boutons, labels, messages → gérée par `i18next` + `react-i18next`. Locales : `fr` et `en` dès le départ.
2. **Multilangue des données** : intégré au schéma de données via `translations: { fr, en }`. Les définitions CC-CEDICT peuplent `translations.en` automatiquement, `translations.fr` est rempli progressivement.

## 7. Découpage en lots

Le projet est **explicitement** découpé pour livrer de la valeur progressivement.

- **Lot 0 — Fondations** : repo, stack, linters, structure hexagonale, schéma de données, premières fixtures, doc de base. Aucune logique métier.
- **Lot 1 — Canvas + validation de tracé** : intégration Hanzi Writer derrière l'abstraction `CharacterRenderer`, gestion du stylet via Pointer Events, grilles Tian/Mi/Hui Zi Ge, modes d'affichage (transparent/caché).
- **Lot 2 — Glossaire** : navigation dans les caractères et mots HSK 1, recherche, lien depuis le glossaire vers le canvas.
- **Lot 3 — Système de révision** : SRS (algorithme **SM-2** au démarrage, ~100 lignes, suffisant pour mono-utilisateur), tracking de progression, sync backend.
- **Lot 4 — Synthèse vocale** : intégration `SpeechSynthesis API` du navigateur, paramétrage voix/vitesse.
- **Lot 5 — Polish & PWA offline complète** : service worker robuste, manifest, mode hors-ligne complet, import HSK 2.

## 8. Méthodologie de travail

### Test-Driven Development (TDD pragmatique)
- **Obligatoire** dans `domain/` (logique pure : validation de schéma, migrations, SRS, parsing, etc.).
- **Optionnel** dans `adapters/` (tests d'intégration ciblés : vraies migrations sur fixtures, vrai SQLite en mémoire pour les repositories, `httptest` pour les handlers).
- **Rare** dans `ui/` et `features/` (sauf pour la logique métier qui y vit, ex : hook de session).

Cycle : red → green → refactor. Validation à chaque étape.

### Documentation continue

Toute décision structurante prise pendant le développement est documentée. La doc est en **français** (sauf code, commentaires de code, et termes techniques standards).

```
docs/
├── README.md                         # index de la doc
├── rfc/
│   ├── README.md                     # index + statuts (draft/accepted/superseded)
│   ├── 0001-vision-et-perimetre.md
│   ├── 0002-stack-technique.md
│   ├── 0003-architecture-hexagonale.md
│   ├── 0004-format-de-donnees-et-versioning.md
│   ├── 0005-strategie-i18n.md
│   ├── 0006-pwa-offline-first.md
│   └── 0007-decoupage-en-lots.md
├── journal/                          # une entrée par session de travail
│   ├── README.md
│   └── AAAA-MM-JJ-titre.md
└── handoff/
    └── CURRENT_STATE.md              # état courant, mis à jour à chaque session
```

### Format des RFC

En-tête standard :

```markdown
# RFC NNNN — Titre

- **Statut** : Brouillon | Accepté | Remplacé | Abandonné
- **Date** : AAAA-MM-JJ
- **Auteur(s)** : ...
- **Lié à** : RFC NNNN, ...
- **Remplace** : RFC NNNN (le cas échéant)

## Contexte
## Décision
## Conséquences
## Alternatives considérées
```

### Journal de bord

Une entrée par **session de travail** (= grosso modo une conversation avec un LLM). Format léger :

```markdown
# AAAA-MM-JJ — Titre court

## Objectif de la session
## Ce qui a été fait
## Découvertes / surprises
## Décisions prises (lien vers RFC si formalisé)
## Reste à faire / prochaines étapes
```

### CURRENT_STATE.md

Fichier **toujours à jour** qui répond à : "où en est le projet, là, maintenant ?". À mettre à jour à la fin de chaque session de travail. Contenu type :

- Lot en cours
- Dernières décisions importantes
- Bloquants connus
- Prochaines étapes concrètes
- Liens vers les RFC pertinentes et la dernière entrée de journal

### CLAUDE.md

À la racine du repo, lu automatiquement par Claude Code. Court et orienté action :

- Présentation du projet en 3 lignes
- Comment est organisé le repo
- Conventions clés (TDD, doc en français, hexagonal, etc.)
- **Pointeur vers `docs/handoff/CURRENT_STATE.md` comme point d'entrée pour reprendre**

## 9. Arborescence cible du monorepo

```
sinogrammes/
├── CLAUDE.md
├── README.md
├── .gitignore
├── .editorconfig
├── Makefile                          # dev, build, lint, test pour les deux côtés
│
├── docs/                             # cf. section 8
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json                 # strict: true, noUncheckedIndexedAccess: true, etc.
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── domain/
│       │   ├── schema/
│       │   │   ├── types.ts
│       │   │   ├── validators.ts     # Zod
│       │   │   └── version.ts
│       │   ├── migrations/
│       │   │   ├── index.ts
│       │   │   └── README.md
│       │   └── ports/
│       │       ├── CharacterRenderer.ts
│       │       ├── ProgressRepository.ts
│       │       └── DataSource.ts
│       ├── adapters/
│       │   ├── renderer/             # HanziWriterRenderer.ts (lot 1)
│       │   ├── storage/              # IndexedDBProgressRepository.ts (lot 3)
│       │   └── api/                  # RestApiClient.ts (lot 3)
│       ├── features/                 # canvas/, glossary/, review/ (par lot)
│       ├── ui/                       # composants UI réutilisables
│       ├── i18n/
│       │   ├── index.ts
│       │   └── locales/
│       │       ├── fr.json
│       │       └── en.json
│       └── lib/
│
├── backend/
│   ├── go.mod
│   ├── go.sum
│   ├── Makefile
│   ├── .golangci.yml
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   └── internal/
│       ├── domain/
│       ├── ports/
│       ├── adapters/
│       │   ├── http/
│       │   └── sqlite/
│       ├── migrations/               # SQL versionné par goose
│       └── config/
│
└── shared/
    ├── README.md
    └── schema/
        ├── data-schema.v1.json
        └── examples/
            └── hsk1_sample.json
```

## 10. Questions encore ouvertes

À traiter au démarrage du Lot 0 :

1. **OS de développement de l'utilisateur** : Linux / macOS / Windows ? Impacte le Makefile et les scripts. **À demander.**
2. **Granularité du journal** : une entrée par session de travail recommandée (par conversation LLM), plus fin et plus utile pour les reprises.
3. **RFC vs ADR** : démarrer avec **RFC uniquement** ; ajouter ADR plus tard si besoin réel.
4. **Sourcing HSK 3.0 niveau 1** : trouver une liste publique propre. À gérer au moment d'importer les données réelles (Lot 1+), pas au Lot 0.

## 11. Plan de démarrage (à faire avant tout code)

**Étape 1 — Documentation initiale** (avant toute ligne de code applicatif) :

1. Créer `CLAUDE.md` à la racine, court et orienté action, qui pointe vers `docs/handoff/CURRENT_STATE.md`.
2. Créer `README.md` à la racine (présentation pour humains).
3. Créer la structure `docs/` complète (sous-dossiers vides au besoin).
4. Rédiger les RFC initiales en français à partir du contenu de ce brief :
   - `0001-vision-et-perimetre.md`
   - `0002-stack-technique.md`
   - `0003-architecture-hexagonale.md`
   - `0004-format-de-donnees-et-versioning.md`
   - `0005-strategie-i18n.md`
   - `0006-pwa-offline-first.md`
   - `0007-decoupage-en-lots.md`
5. Créer `docs/handoff/CURRENT_STATE.md` initial : "Lot 0 démarré, doc en place, prochaine étape = squelette frontend".
6. Créer la première entrée de journal `docs/journal/AAAA-MM-JJ-init-projet.md`.

**Étape 2 — Demander à l'utilisateur son OS**, puis figer les commandes du Makefile racine.

**Étape 3 — Initialisation du Lot 0 en TDD** :

1. `shared/schema/data-schema.v1.json` (JSON Schema officiel) + fixture d'exemple.
2. `backend/` : `go mod init`, structure de dossiers, premier endpoint `/health` testé en TDD, golangci-lint configuré.
3. `frontend/` : Vite + React + TS strict + Tailwind + ESLint + Prettier + Vitest. Premier composant "Hello" trivial avec toggle FR/EN via i18next, testé.
4. `frontend/src/domain/schema/` : types TS + validateurs Zod du schéma v1.0.0, **avec tests unitaires sur fixtures**.
5. Squelette du système de migrations (orchestrateur + dossier vide + README expliquant la convention).
6. `make dev`, `make lint`, `make test` fonctionnels à la racine.

**Étape 4 — Clôture du Lot 0** : mettre à jour `CURRENT_STATE.md`, écrire l'entrée de journal correspondante, commit.

## 12. Décisions explicitement reportées

Pour mémoire, ces points ne sont **pas** à traiter au Lot 0 :

- Algorithme SRS détaillé (Lot 3, par défaut **SM-2**).
- Synthèse vocale (Lot 4).
- Service worker et PWA installable (Lot 5).
- Bascule des données de référence vers le backend (post-MVP).
- Export/import de decks Anki (post-MVP).
- Docker / CI / déploiement (à introduire avant la première mise en prod).
- Authentification (hors scope tant que mono-utilisateur).

---

**Fin du brief.** Pour reprendre la main : lire ce document, puis consulter `docs/handoff/CURRENT_STATE.md` si déjà initialisé, sinon dérouler la section "Plan de démarrage" ci-dessus.
