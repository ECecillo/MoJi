# CURRENT_STATE — état courant du projet

> **Fichier toujours à jour.** À mettre à jour à la fin de chaque session de travail. Répond à la question : "où en est le projet, là, maintenant ?"

**Dernière mise à jour** : 2026-06-13 (Lot 5 — import HSK 2)

## Lot en cours

**Lot 5 — Polish & PWA** : 🟡 **en cours** — PWA/offline/Lighthouse/icônes + **import HSK 2** livrés. Reste : test d'installation réel sur Boox (matériel).

**Lot 4 — Synthèse vocale** : ✅ **clôturé** (API SpeechSynthesis, SpeakButton intégré).

**Lot 3 — Système de révision** : ✅ **clôturé, critère de sortie atteint** — sync backend single-origin + merge par champ (RFC 0011, 2026-06-13).

**Lot 2** : ✅ clôturé officiellement (RFC 0007 + RFC 0010).

## Ce qui est fait

### Lot 0 (clôturé)

Cf. [`docs/journal/2026-05-24-lot0-fondations.md`](../journal/2026-05-24-lot0-fondations.md). Documentation initiale, structure du monorepo, schéma de données v1 + fixture, backend Go avec `/health` en TDD, frontend Vite/React/TS strict + Tailwind + Vitest + i18n FR/EN, ports hexagonaux, orchestrateur de migrations, Makefile racine.

### Lot 1 (clôturé) — Canvas et validation de tracé

Cf. journal Lot 1 : sourcing HSK 1, `BundledDataSource`, `HanziWriterRenderer`, capture Pointer Events, grilles calligraphiques et modes d'affichage. L'app permet de choisir un caractère, le tracer au stylet, valider l'ordre des traits.

### Lot 2 (clôturé) — Glossaire

Cf. [`docs/journal/2026-05-28-lot2-glossaire-recherche.md`](../journal/2026-05-28-lot2-glossaire-recherche.md) et [`docs/journal/2026-05-30-fiches-detaillees-glossaire.md`](../journal/2026-05-30-fiches-detaillees-glossaire.md).

- ✅ **Composant `Glossary`** (`src/features/glossary/`) : liste HSK 1 navigable, deux onglets `caractères` / `mots`, compteurs, état `loading` pendant le parse Zod.
- ✅ **Recherche unique** sur hanzi + pinyin (diacritique et ASCII) + traductions toutes langues confondues.
- ✅ **Helper pinyin** (`src/lib/pinyin.ts`) : `pinyinToString` (diacritique) + `pinyinToAscii` (insensible aux tons et au tréma).
- ✅ **Routing app** glossary ↔ detail ↔ practice : `App.tsx` orchestre via état local et `detailEntryId`, back-stack à 3 niveaux (depuis practice on revient à la fiche si on est passé par elle, sinon directement au glossaire).
- ✅ **Composant `EntryDetail`** (`src/features/glossary/EntryDetail.tsx`) : vue dédiée plein écran, header hanzi/pinyin, infos (HSK, traits, radicaux, fréquence), sens groupés par langue avec langue courante d'abord, cross-refs cliquables (caractère → mots qui le contiennent / mot → caractères constitutifs), section examples conditionnelle.
- ✅ **Bouton "Détails" séparé de "Tracer"** sur chaque carte du glossaire (cibles stylet larges et non ambiguës).
- ✅ **i18n FR/EN** : nouvelle clé `glossary.details` + sous-objet `glossary.detail.*` (back, practice, facts, hsk, stroke_count, radicals, frequency, meanings, no_translations, appears_in_words, constituent_characters, examples, not_found).

### Outillage doc (session du jour)

Cf. [`docs/journal/2026-05-28-carnet-html.md`](../journal/2026-05-28-carnet-html.md).

- ✅ **Carnet de bord HTML autonome** : `docs/index.html` généré par `make docs` (script `frontend/scripts/build-docs-index.ts`). Section État courant + RFC + Journal + Brief, navigation par ancres, mode sombre, mode print.
- ✅ **Discipline `CLAUDE.md`** : `make docs` est obligatoire après toute modif markdown sous `docs/` ou de `BRIEF.md`, dans le même commit.

### Outillage développeur — bootstrap mise (session 5)

Cf. [`docs/journal/2026-05-30-mise-bootstrap-dev.md`](../journal/2026-05-30-mise-bootstrap-dev.md).

- ✅ **`mise.toml` racine** : versions pinées Node 24.15.0, Go 1.26.2, golangci-lint 2.9.0.
- ✅ **Tâche `mise run setup`** : `make install` + installation Chromium Playwright (`npx playwright install chromium`).
- ✅ **Tâches mise miroir** vers le Makefile : `dev`, `test`, `test-e2e`, `lint`, `typecheck`, `build`, `docs`, `build-data`.
- ✅ **README mis à jour** : quick start en quatre commandes (`mise trust`, `mise install`, `mise run setup`, `make dev`), puis renvoi au Makefile pour toutes les commandes projet.

### Correctif Canvas (session du jour, suite d'un retour d'usage)

Cf. [`docs/journal/2026-05-28-fix-canvas-feedback.md`](../journal/2026-05-28-fix-canvas-feedback.md).

- ✅ **Mount Hanzi Writer stable** : déps du useEffect réduites à `[hanzi, renderer]`, gating via `mountVersion`. Plus de perte du quiz quand on bascule outline/character.
- ✅ **Reset au changement de hanzi** : traits user et verdict vidés quand on sélectionne un autre caractère depuis le glossaire.
- ✅ **Feedback de verdict** : compteur i18n `N trait(s) validé(s)`, message explicite après chaque trait (accepté + N° / refusé + raison), bloc `aria-live="polite"`.
- ✅ **Distinction visuelle** : trait validé en transparent fin (laisse le trait propre Hanzi Writer dominer), trait refusé en gris épais dashed.
- ✅ Couverture : 6 tests nouveaux dont l'**assertion critique** que `mount` n'est pas rappelé sur toggle outline (la régression aurait été détectée immédiatement).

### Tests E2E Playwright (session du jour)

Cf. [RFC 0009](../rfc/0009-tests-e2e.md) et [`docs/journal/2026-05-28-playwright-e2e.md`](../journal/2026-05-28-playwright-e2e.md).

- ✅ Playwright installé, config Chromium seul, `webServer` qui démarre Vite automatiquement.
- ✅ 5 fichiers de scénarios (10 tests) : smoke, glossaire, navigation, langue, canvas. `make test-e2e` séparée de `make test`.
- ✅ **Bug race condition StrictMode corrigé** : la 1ʳᵉ `renderer.mount()` qui résolvait après son cleanup pouvait clobber le `_quiz` de la 2ᵉ. Symptôme : `validateStroke` levait au premier trait. Détecté par Playwright, invisible aux tests unitaires.
- ✅ `setPointerCapture/releasePointerCapture` wrappés en try/catch (résilience aux events synthétiques + edge cases prod).
- ✅ Signal `data-renderer-mounted` sur la couche d'input pour gate les tests.
- ✅ Discipline ajoutée à CLAUDE.md : `make test-e2e` recommandé avant push après changement de UI/flow.

### Verrou E2E StrictMode (session du jour)

Cf. [`docs/journal/2026-05-30-fiches-detaillees-glossaire.md`](../journal/2026-05-30-fiches-detaillees-glossaire.md).

- ✅ `e2e/strict-mode-regression.spec.ts` (2 scénarios) : toggle outline 3× puis tracé d'un trait (assert verdict visible + aucun `pageerror`/`console.error` lié à Hanzi Writer) ; stress test 10 toggles consécutifs.
- ✅ Fiche `entry-detail.spec.ts` (3 scénarios) : navigation glossary → detail → practice → ← → detail → ← → glossary, cross-ref caractère → mot lié, cross-ref mot → caractère constitutif.

### Canvas — détection trait répété + Annuler / Tout effacer (session 2)

Cf. [`docs/journal/2026-05-30-canvas-undo-reset-repeat-detection.md`](../journal/2026-05-30-canvas-undo-reset-repeat-detection.md).

- ✅ **Détection géométrique du trait répété** dans `Canvas` : helper `lib/strokeSimilarity.ts` (comparaison des endpoints, tolérance 15 % de la taille du canvas). Si un trait refusé matche un trait précédemment validé, on requalifie le verdict en `repeated_stroke` et on ne pollue pas le SVG.
- ✅ **Boutons `Annuler` et `Tout effacer`** sous le compteur. Désactivés quand il n'y a rien à défaire. `Tout effacer` appelle `renderer.reset()` ; `Annuler` ne touche qu'à l'affichage (état quiz Hanzi Writer inchangé).
- ✅ Port `CharacterRenderer` étendu avec `reason: 'repeated_stroke'` (valeur synthétisée par l'UI, jamais produite par l'adapter).
- ✅ Couverture : 9 tests sur le helper, 7 tests sur Canvas, 3 scénarios E2E (`e2e/canvas-controls.spec.ts`).

### Lot 3 sprint 1 — SM-2 + ProgressRepository localStorage (session 4)

Cf. [`docs/journal/2026-05-30-lot3-sprint1.md`](../journal/2026-05-30-lot3-sprint1.md).

- ✅ **Bibliothèque SRS pure** (`src/lib/srs/`) : `sm2.ts` (applyReview, ease minoré 1.3, intervalle SM-2 standard), `quality.ts` (mapping refusals → quality 0-5, abandon → 0), `dueQueue.ts` (isDue, countDue, pickNextDue). 23 tests Vitest.
- ✅ **Adapter `LocalStorageProgressRepository`** : implémente le port `ProgressRepository` (Lot 0). Blob JSON sous `sinogrammes:progress`, `schema_version: 1`, retombe sur `[]` en cas de corruption / version inconnue. 9 tests.
- ✅ **Renderer port étendu** avec `setOnComplete(callback): () => unregister`. Implémenté côté Hanzi Writer via `QuizOptions.onComplete`.
- ✅ **Canvas** : compteur de refus authentiques (hors `repeated_stroke`) via `useRef`, émission `onCharacterCompleted({refusals, completed: true})` une seule fois par session, reset au changement de hanzi et à `resetAll`. 5 tests sur l'émission.
- ✅ **Hook `useProgress`** : charge la progression, expose `entries` réactif et `recordSession(ref, session, today?)` qui applique SM-2 + persiste. 5 tests d'intégration (création, cumul, abandon, persistance reload).
- ✅ **App** : charge le bundle pour résoudre hanzi ↔ id, gère `onCharacterCompleted` du Canvas, expose un bouton **"Réviser (N)"** dans le header qui ouvre le caractère le plus en retard via `pickNextDue`. Désactivé si N=0.
- ✅ **i18n** : section `review.button_*` avec pluralisation.
- ✅ **E2E** (`e2e/srs-review.spec.ts`, 4 scénarios) : seed localStorage + assertions sur le compteur, l'ouverture du bon caractère, la persistance au reload.
- ⚠ **Déviation explicite à RFC 0007** : localStorage au lieu d'IndexedDB pour le sprint 1. Justifications dans le journal (parité RFC 0010, volume petit, migration future via le port). Décision tracée sans nouvelle RFC.

### Lot 3 sprint 2 — UI Enhancements & Dashboard (session du jour)

Cf. [`docs/journal/2026-05-30-lot3-ui-enhancements.md`](../journal/2026-05-30-lot3-ui-enhancements.md).

- ✅ **Filtres de statut** (`src/lib/glossaryFilters.ts`) : New, Learning, Due, Mastered.
- ✅ **Badges glossaire** (`StatusDot`) : indicateur de couleur discret sur chaque carte.
- ✅ **Stats détaillées** (`EntryDetail.tsx`) : section Progression avec tentatives, succès et dates.
- ✅ **Dashboard** (`src/features/progress/Dashboard.tsx`) : vue globale, statistiques par statut, activité récente. Accessible via bouton 📊.
- ✅ **i18n** complet FR/EN pour toutes les nouvelles fonctionnalités.

### Lot 3 sprint 3 — Infrastructure Backend (session du jour)

Cf. [`docs/journal/2026-05-30-lot3-backend.md`](../journal/2026-05-30-lot3-backend.md).

- ✅ **Modèles Go** calqués sur le frontend (`internal/domain/progress.go`).
- ✅ **SQLite sans cgo** (`internal/adapters/sqlite/`) : persistance robuste via `modernc.org/sqlite`.
- ✅ **Migrations SQL** via `goose` : table `progress` avec clé primaire composée.
- ✅ **API REST** (`internal/adapters/http/progress_handler.go`) : endpoints `GET` et `POST` sur `/api/progress` pour le sync batch.
- ✅ **Tests unitaires et intégration** : repository (base en mémoire) et handlers.

### Lot 4 — Synthèse vocale (session du jour)

Cf. [`docs/journal/2026-05-31-lot4-speech-synthesis.md`](../journal/2026-05-31-lot4-speech-synthesis.md).

- ✅ **SpeechProvider** : abstraction pour l'audio.
- ✅ **WebSpeechProvider** : adapter utilisant l'API native `SpeechSynthesis`.
- ✅ **SpeakButton** : composant UI réutilisable.
- ✅ **Intégration** : ajout de l'audio dans le Glossaire, la fiche Détail et le Canvas.

### Lot 5 / polish — réglage global de la voix (session du jour)

Cf. [`docs/journal/2026-05-31-reglage-voix-global.md`](../journal/2026-05-31-reglage-voix-global.md).

- ✅ **Contexte vocal global** (`src/features/speech/`) : `SpeechSettingsProvider` centralise le `SpeechProvider`, expose les voix disponibles et la voix sélectionnée.
- ✅ **Sélecteur de voix chinois** dans l'en-tête : choix parmi les voix `zh-*` exposées par le navigateur, avec option automatique.
- ✅ **Persistance locale** : URI de voix conservée sous `sinogrammes:speech:voice-uri`.
- ✅ **SpeakButton globalisé** : les boutons d'écoute réutilisent tous le même réglage.
- ✅ **Fallback robuste** : absence d'API Web Speech tolérée ; si une voix sauvegardée disparaît, retour automatique vers `zh-CN` puis `zh-*`.

### Lot 5 — socle PWA offline (session du jour)

Cf. [`docs/journal/2026-06-01-lot5-pwa-baseline.md`](../journal/2026-06-01-lot5-pwa-baseline.md).

- ✅ **Manifest PWA** (`frontend/public/manifest.webmanifest`) : app standalone, langue FR, scope `/`, couleurs e-ink, icônes SVG `any` + `maskable`.
- ✅ **Meta installabilité/mobile** dans `frontend/index.html` : `theme-color`, description, apple mobile web app, manifest, favicon.
- ✅ **Service worker généré par Vite** : `dist/sw.js` est émis au build avec la liste des assets hashés.
- ✅ **Stratégies offline** : cache-first pour assets, network-first pour `GET /api/`, fallback navigation vers `index.html`.
- ✅ **Enregistrement production-only** : `registerServiceWorker()` ne s'active qu'en build production, sans perturber dev/test.
- ✅ **Accessibilité e-ink baseline** : `prefers-reduced-motion` et `prefers-contrast: more` pris en compte dans `index.css`.
- ✅ **Validation offline production** : `vite preview` + Chromium Playwright, activation SW puis reload offline OK (`offline-ok`).

### Lot 5 — import HSK 2 (2026-06-13)

Cf. [`docs/journal/2026-06-13-lot5-hsk2.md`](../journal/2026-06-13-lot5-hsk2.md) et [RFC 0012](../rfc/0012-extension-hsk2.md).

- ✅ **Périmètre étendu à HSK 3.0 niveaux 1–2** : 598 caractères (300 + 298) et 1256 mots (506 + 750). `CLAUDE.md`/`AGENTS.md` à jour.
- ✅ **Sourcing généralisé** (`vendor-sources.ts`, `LEVELS=[1,2]`) : `drkameleon-hsk30-l{1,2}.json` + `makemeahanzi-hsk{1,2}-meta.jsonl` (chars exclusifs par niveau). Couverture `hanzi-writer-data` vérifiée (0 manquant).
- ✅ **Build par niveau** (`build-hsk1-data.ts`) : niveau = plus bas d'apparition, niveaux disjoints. Émet `hsk2.generated.json` + `hsk2-stroke-data.generated.json`. **Sorties HSK 1 byte-identiques**. Schéma inchangé (Zod acceptait déjà 1–9).
- ✅ **Merge au chargement** : `bundledReferenceData` + loader de tracés fusionnent les niveaux ; chaque niveau reste un **chunk paresseux** séparé (shell inchangé ~350 KB).
- ✅ **Filtre par niveau HSK** dans le glossaire (`GlossaryFilters.hskLevels` + FilterPanel + i18n).
- ✅ **Tests** : `hsk2.generated.test` (compteurs, niveau, disjonction, intégrité inter-fichiers), `hsk2-stroke-data.test`, filtre niveau, e2e (compteur 598 + filtre HSK 2).

### Lot 3 — synchronisation backend, critère de sortie atteint (2026-06-13)

Cf. [`docs/journal/2026-06-13-lot3-sync-backend.md`](../journal/2026-06-13-lot3-sync-backend.md) et [RFC 0011](../rfc/0011-sync-backend.md).

- ✅ **Déploiement single-origin** : le binaire Go sert le `dist/` **et** l'API sur une seule origine (`SINO_STATIC_DIR`, SPA fallback). API same-origin, zéro CORS. Cible `make serve` (build + `SINO_HOST=0.0.0.0` pour le LAN). Proxy Vite `/api → :8787` en dev.
- ✅ **Merge par champ** (RFC 0011), symétrique client + serveur : record le plus avancé adopté (max `attempts`, tie → `last_seen`), record entier, refs disjointes conservées. Côté serveur via clause `WHERE` sur l'upsert SQLite ; côté client via `lib/progressMerge.ts`.
- ✅ **`useProgress.sync`** = pull → merge → push (protège le local plus avancé) ; déclencheurs `focus`/`visibilitychange`/`online` + garde anti-concurrence ; indicateur de sync discret (footer).
- ✅ **Vérif HTTP réelle** : binaire servant `dist/`, POST/GET round-trip OK, merge par champ confirmé (périmé ignoré, plus avancé gagne).
- ✅ **E2E** `e2e/sync.spec.ts` (API mockée via `page.route`) : progression distante fusionnée au chargement, état local poussé au serveur.
- ⚠ **Limite assumée** : `attempts` non sommés entre appareils (max), sans perte de progression en mono-utilisateur. Schéma inchangé (pas de migration).

### Lot 5 — icônes PNG + audit Lighthouse (2026-06-13)

Cf. [`docs/journal/2026-06-13-lot5-icones-png-lighthouse.md`](../journal/2026-06-13-lot5-icones-png-lighthouse.md).

- ✅ **Icônes PNG 192/512** (normales + maskable) générées par `make build-icons` (script `build-icons.ts`, rastérisation via le Chromium Playwright, sans nouvelle dépendance). Manifest, `apple-touch-icon`, favicon de repli et précache SW mis à jour. SVG conservés comme source.
- ✅ **Audit Lighthouse** (mobile, build prod via `vite preview` + Chromium Playwright) : Performance **97**, Accessibilité **100**, Bonnes pratiques **100** (FCP ~1,5 s, LCP ~2,3 s, TBT 0 ms, CLS ~0,001).
- ✅ **Correctif a11y contraste** : `ink.faint` `#888888` (3,54:1) → `#6F6F6F` (~5:1), franchit le seuil AA sur petit texte (cartes glossaire, footer).
- ✅ **Correctif best-practices / offline-first** : un sync raté (backend absent) ne pollue plus la console — `useProgress` journalise en `console.debug` (best-effort) ; `RestSyncClient.pull` détecte une réponse non-JSON et lève une erreur claire (+1 test).

### Lot 5 — code-splitting du chunk principal (2026-06-13)

Cf. [`docs/journal/2026-06-13-lot5-code-splitting.md`](../journal/2026-06-13-lot5-code-splitting.md).

- ✅ **Données de référence en chunk paresseux** : nouveau loader `adapters/data/bundledReferenceData.ts` (`loadBundledDataSource()`) qui importe `hsk1.generated.json` en dynamique et expose une **instance `BundledDataSource` partagée** (un seul parse Zod). `App`, `Glossary`, `EntryDetail` ne l'importent plus statiquement.
- ✅ **Chunk principal 573 KB → 348 KB** (gzip 103 KB, −39 %). Les 226 KB de données forment un chunk séparé chargé en parallèle dès le glossaire (offline préservé via précache SW, masqué par l'état de chargement existant).
- ⏹ **Lazy-load de `hanzi-writer` abandonné** : sorti du chunk principal, il cassait l'interaction canvas en production (le SVG monté en différé interceptait les clics — bisection E2E déterministe). Gain de 37 KB seulement → non justifié. `hanzi-writer` reste eager.

### Lot 5 — optimisation des assets Hanzi Writer (2026-06-13)

Cf. [`docs/journal/2026-06-13-lot5-optim-assets-hanzi-writer.md`](../journal/2026-06-13-lot5-optim-assets-hanzi-writer.md).

- ✅ **Sous-ensemble de tracés généré** : `build-hsk1-data.ts` produit désormais aussi `frontend/src/data/hsk1-stroke-data.generated.json` (map `hanzi → { strokes, medians }`), restreint aux 300 caractères HSK 1, extrait du paquet pinné `hanzi-writer-data`. Échec dur si un caractère manque.
- ✅ **Renderer simplifié** : `loadBundledHanziWriterData` charge ce fichier unique en import dynamique paresseux (mémoïsé) au lieu de globber les ~9 600 JSON de `hanzi-writer-data`. Signature et erreurs publiques inchangées.
- ✅ **Gain build** : modules transformés **9 600 → 93**, `dist/sw.js` (précache) **~260 KB → 2,25 KB**, chunk principal **~1,5 MB → 573 KB**. Données toujours 100 % offline (1 chunk paresseux mis en cache par le SW).
- ✅ **Test d'intégrité** `hsk1-stroke-data.generated.test.ts` : couverture exacte des 300 caractères + cohérence `strokes`/`medians`.
- ⚠ **Découverte toolchain** : les tests exigent **Node 24.15.0** (épinglé `mise.toml`). Sous Node 25, jsdom@25 expose un `localStorage` cassé → 46 faux échecs. Lancer via `mise exec node@24.15.0 -- …` (ou shell mise activé). Aucun correctif code.

### Clôture du Lot 2 — éditeur FR + filtres (session 3)

Cf. [`docs/journal/2026-05-30-cloture-lot2.md`](../journal/2026-05-30-cloture-lot2.md) et [RFC 0010](../rfc/0010-surcharges-traductions-locales.md).

- ✅ **Éditeur de traductions FR (surcharges locales)** : port hexagonal `TranslationOverrideRepository` + adapter `LocalStorageTranslationOverrideRepository` (blob JSON sous clé versionnée). Helper `lib/translations.ts` pour fusionner bundle + surcharges (le bundle est remplacé pour la langue surchargée). Hook `useTranslationOverrides`. UI inline dans `EntryDetail` avec marqueur `✎` sur la langue surchargée. `Glossary` consomme aussi le hook : les traductions FR saisies sont **chercheables** immédiatement.
- ✅ **Filtres glossaire** : helper pur `lib/glossaryFilters.ts` (matchesFilters, isFilterActive, activeFilterCount, uniqueTagsOf). Sous-composant `FilterPanel` replié par défaut, badge sur le bouton de toggle. Trois axes : tags (multi-select), nombre de traits (min/max), rang de fréquence (min/max). Caractère-only sont masqués automatiquement sur l'onglet Mots.
- ✅ **RFC 0010 publiée** pour formaliser le format de stockage (`schema_version: 1`, blob unique, sémantique de merge), permettre les migrations futures et préparer la bascule vers backend Lot 3+.
- ✅ Couverture : 6 tests `translations.ts` + 10 tests adapter + 12 tests `glossaryFilters.ts` + 4 tests édition FR dans `EntryDetail` + 3 tests filtres dans `Glossary`. E2E : 3 scénarios filtres + 3 scénarios éditeur FR (persistance reload, recherche après ajout, Annuler n'écrit rien).

## Vérifications croisées

> ⚠ **Toolchain** : lancer impérativement sous le Node épinglé (`mise.toml` → Node 24.15.0), p. ex. `mise exec node@24.15.0 -- env -u GOROOT make test`. Sous Node 25, jsdom expose un `localStorage` cassé → 46 faux échecs.

- `make test` : **239 tests front passent**, paquets back passent avec `-race`.
- `make test-e2e` : **31/31 tests E2E verts** (Chromium, ~13 s).
- `make lint` : ESLint + Prettier propres, golangci-lint 0 issue.
- `make typecheck` : `tsc --noEmit` propre.
- `make build` : bundle front + binaire back OK, chunk principal **348 KB**, `dist/sw.js` précache les 4 PNG.
- `make build-icons` : 4 PNG (192/512, normal + maskable) régénérés.
- **Lighthouse** (mobile, prod) : Performance 97 · Accessibilité 100 · Bonnes pratiques 100.
- `make docs` : `docs/index.html` à jour.

## Dernières décisions importantes

- 2026-06-13 : **périmètre étendu à HSK 3.0 niveaux 1–2** (RFC 0012). Sourcing cumulatif (niveau = plus bas d'apparition), fichiers générés **par niveau** + merge au chargement (HSK 1 byte-identique, HSK 3 trivial), schéma inchangé, filtre niveau au glossaire.
- 2026-06-13 : **Lot 3 — déploiement single-origin + merge par champ** (RFC 0011). Le binaire Go sert front + API ; merge par champ symétrique client/serveur (max attempts, tie → last_seen), schéma inchangé. Clôt le critère de sortie multi-appareils.
- 2026-06-13 : **sync = best-effort silencieux en offline-first**. Backend absent / hors-ligne = cas nominal : journalisé en `console.debug`, jamais `console.error`. `RestSyncClient.pull` vérifie le content-type.
- 2026-06-13 : **icônes PNG rastérisées via Playwright Chromium** (`make build-icons`), pas de dépendance de rastérisation. SVG conservés comme source de vérité.
- 2026-06-13 : **`ink.faint` = `#6F6F6F`** (au lieu de `#888888`) pour franchir le seuil de contraste AA (4,5:1) sur petit texte.
- 2026-06-13 : **données de référence chargées en dynamique** (`loadBundledDataSource`), instance `BundledDataSource` partagée. Chunk principal −39 % ; le shell ne dépend plus de la taille des données pour son premier rendu.
- 2026-06-13 : **`hanzi-writer` reste eager**. Son lazy-load casse l'interaction canvas en production (SVG différé qui capte les clics, prouvé par bisection E2E) ; 37 KB ne le justifient pas.
- 2026-06-13 : **données de tracé = sous-ensemble généré hors-ligne**, pas de glob de `hanzi-writer-data` au build. Le pipeline (RFC 0008) produit un fichier unique restreint à HSK 1, chargé en import dynamique paresseux. Réduit le précache SW de ~260 KB à 2,25 KB et le bundle de ~9 600 à 93 modules.
- 2026-06-13 : **les tests exigent Node 24.15.0** (épinglé via mise). Sous Node 25 le `localStorage` jsdom est cassé. Toujours passer par la toolchain mise.
- 2026-06-01 : **PWA sans dépendance externe**. Le service worker est généré par un plugin Vite local, actif en production uniquement, avec cache-first assets et network-first API GET.
- 2026-06-01 : **offline d'abord = shell + assets bundlés**. La résolution de conflits/sync backend offline reste hors du premier incrément Lot 5.
- 2026-05-31 : **voix = préférence globale locale**. Le choix de voix est stocké dans `localStorage`, appliqué à tous les `SpeakButton`, et reste best-effort car la liste réelle dépend du navigateur/OS (notamment Boox/Android).
- 2026-05-30 (s5) : **mise = bootstrap toolchain, Makefile = orchestration**. `mise.toml` pinne Node/Go/golangci-lint et expose des alias, mais les commandes de build/test restent centralisées dans le Makefile.
- 2026-05-30 (s4) : **déviation à RFC 0007 sur la persistance du Lot 3** : localStorage au lieu d'IndexedDB pour le sprint 1. Justifié par parité avec RFC 0010, volume petit, migration future possible via le port `ProgressRepository`. Décision tracée dans le journal, pas de nouvelle RFC pour cette première itération.
- 2026-05-30 (s4) : **SM-2 = unité de progression au caractère, pas au mot**. Les mots ne sont pas tracés en propre dans le Lot 1-2 ; les ajouter à la file SRS demanderait une UX dédiée (tracé séquentiel des constituants) qui sortirait du périmètre.
- 2026-05-30 (s4) : **convention SM-2 : update ease avant compute interval** (vs l'inverse présent dans certaines références). Effet : intervalles très légèrement plus grands ; négligeable mono-utilisateur.
- 2026-05-30 (s3) : **port `TranslationOverrideRepository` côté domain + adapter localStorage** (cf. [RFC 0010](../rfc/0010-surcharges-traductions-locales.md)). Format : blob JSON unique versionné. Sémantique : la surcharge remplace intégralement le bundle pour la langue concernée (pas d'empilement).
- 2026-05-30 (s3) : **édition limitée à la langue courante** (l'utilisateur FR édite son FR). UI inline, marqueur ✎ pour distinguer ses traductions de celles du bundle.
- 2026-05-30 (s3) : **filtres glossaire = 3 axes** (tags, traits, fréquence). Le statut d'apprentissage est officiellement reporté au Lot 3. Le filtre par tags est rendu même si aucun tag n'est encore présent dans le bundle (extensibilité prête).
- 2026-05-30 (s2) : **détection trait répété côté UI**, pas côté port. `Canvas` synthétise un `reason: 'repeated_stroke'` quand un trait refusé matche géométriquement un trait accepté. L'adapter Hanzi Writer reste agnostique.
- 2026-05-30 (s2) : **Annuler n'efface que l'affichage**, pas l'état du quiz Hanzi Writer. Pour défaire l'avancement quiz, il faut Tout effacer.
- 2026-05-30 (s2) : **trait inversé ≠ trait répété**. La comparaison des endpoints est ordonnée (début↔début, fin↔fin), donc tracer en sens inverse reste signalé `wrong_direction` par Hanzi Writer.
- 2026-05-30 : **fiche détaillée = vue dédiée plein écran** (pas modale ni panneau latéral). Cohérent avec le pattern existant glossary ↔ practice, zéro transparence pour l'e-ink, zéro animation latérale.
- 2026-05-30 : **deux boutons séparés "Détails" + "Tracer"** sur chaque carte du glossaire — plus explicite que clic-carte avec un seul bouton ; cibles stylet plus larges et sans ambiguïté.
- 2026-05-30 : **back-stack à 3 niveaux** (glossary → detail → practice). Le retour depuis practice ramène à la fiche si on est passé par elle, sinon directement au glossaire.
- 2026-05-30 : **verrou E2E explicite du bug StrictMode** via `pageerror` + filtre `console.error` (quiz/hanzi/TypeError). Filet de sécurité durable même si quelqu'un refactorise le mount sans le savoir.
- 2026-05-28 : **recherche pinyin par défaut insensible aux diacritiques** dans le glossaire — l'utilisateur tape sur un clavier ASCII, on accepte la perte `nǚ → nu` pour la recherche tout en gardant l'affichage diacritique.
- 2026-05-28 : **carnet HTML versionné dans le repo** plutôt que généré-au-build. Diff bruyant accepté en échange de la facilité de consultation (double-click sur `docs/index.html`).
- 2026-05-28 : `docs/index.html` est régénéré dans le **même commit** que les markdown modifiés (pas dans un commit séparé).
- 2026-05-28 : **mount Hanzi Writer strictement lié à `[hanzi, renderer]`** ; toute autre dépendance qui s'ajouterait passe désormais par des effets de visibilité dédiés (gating via `mountVersion`).
- 2026-05-28 : **trait user validé estompé** (opacity 0.3, fin) pour laisser dominer le trait propre Hanzi Writer ; trait refusé bien visible (dashed gris épais).
- 2026-05-28 : **Playwright comme framework E2E** ([RFC 0009](../rfc/0009-tests-e2e.md)), Chromium seul, `frontend/e2e/`, cible `make test-e2e` séparée. MCP Playwright à installer côté machine utilisateur (instructions dans la RFC et le journal).
- 2026-05-28 : **`.then()` du mount async ne doit jamais appeler `renderer.unmount()` dans la branche cancelled** — le cleanup du useEffect s'en charge, et l'instance renderer est partagée entre les mounts StrictMode.

## Bloquants connus

Aucun.

## Prochaines étapes — Lot 5

- ✅ ~~**Optimisation assets Hanzi Writer**~~ : fait (2026-06-13). Sous-ensemble généré, glob supprimé, précache SW ~260 KB → 2,3 KB.
- ✅ ~~**Code-splitting du chunk principal**~~ : fait (2026-06-13). Données en chunk paresseux, chunk principal 573 KB → 348 KB. Le reste est du vendor incompressible (React/i18n/zod) ; lazy-load des vues = gain marginal, non prioritaire.
- ✅ ~~**Audit Lighthouse production**~~ : fait (2026-06-13). Perf 97 / A11y 100 / Best-practices 100.
- ✅ ~~**Icônes PNG**~~ : fait (2026-06-13). 192/512 normal + maskable, manifest + SW à jour.
- ✅ ~~**Offline API / sync**~~ : traité avec le Lot 3 (RFC 0011) — sync best-effort silencieuse, déclencheurs focus/online, merge par champ.
- ✅ ~~**Import HSK 2**~~ : fait (2026-06-13, RFC 0012). 598 caractères / 1256 mots, fichiers par niveau + merge, filtre niveau au glossaire. HSK 3+ = ajout trivial d'un niveau.
- **Audit accessibilité (navigation clavier)** : reduced-motion/contrast OK (Lighthouse a11y 100) ; reste un passage clavier dédié à faire.
- **Audit installabilité réel** : tester l'installation sur Boox Air 5c et sur ordinateur (nécessite le matériel). Inclut désormais un test de **sync réelle Boox ↔ ordinateur** sur le LAN via `make serve`.

## Lot 3 — clôturé

Sprint 1 (révision locale SRS), sprint 2 (UI/dashboard), sprint 3 (infra backend),
puis sync de bout en bout (RFC 0011, 2026-06-13). **Critère de sortie RFC 0007
atteint** : révision quotidienne locale + progression retrouvée sur un autre appareil
après sync (single-origin, merge par champ).

Pistes ultérieures, non bloquantes (hors Lot 3) :

- **IndexedDB (quand justifié)** : bascule de localStorage vers IndexedDB si le volume ou les besoins de query (indexes par date, transactions) le justifient. Nécessitera une RFC qui documente le schéma et la migration depuis localStorage.
- **Sync concurrente avancée** : horodatage / CRDT (sommation des compteurs) seulement si un réel besoin multi-appareils concurrent apparaît.

## Liens utiles

- Brief figé : [`../../BRIEF.md`](../../BRIEF.md)
- Carnet HTML : [`../index.html`](../index.html)
- Index des RFC : [`../rfc/README.md`](../rfc/README.md)
- Index du journal : [`../journal/README.md`](../journal/README.md)
- Provenance des sources vendorées : [`../../shared/data/sources/_provenance.json`](../../shared/data/sources/_provenance.json)
