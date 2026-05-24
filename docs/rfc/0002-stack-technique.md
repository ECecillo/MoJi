# RFC 0002 — Stack technique

- **Statut** : Accepté
- **Date** : 2026-05-24
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0001 (vision), RFC 0003 (architecture hexagonale), RFC 0006 (offline-first)

## Contexte

Il faut choisir une stack qui soit :

- **Stable** et bien documentée (projet long, mono-développeur).
- **Adaptée au web installable PWA**, avec un excellent support du stylet sur Chromium 111+ (Boox).
- **Sobre côté backend** : un seul utilisateur, déploiement sur VPS perso, pas de gros besoin de concurrence.
- **Compatible avec une discipline TDD** (cf. RFC 0007).
- **Plug-and-play** : on doit pouvoir remplacer une brique (la lib de tracé, le routeur HTTP, la base) sans gros refacto, ce qui implique de bien isoler ces briques (cf. RFC 0003).

## Décision

### Frontend

| Brique                  | Choix                                                                |
|-------------------------|----------------------------------------------------------------------|
| Build / dev server      | **Vite**                                                             |
| Framework UI            | **React 18**                                                         |
| Langage                 | **TypeScript en mode `strict`** (et `noUncheckedIndexedAccess: true`) |
| Styling                 | **Tailwind CSS**                                                     |
| Validation runtime      | **Zod**                                                              |
| i18n interface          | **i18next** + **react-i18next** (locales `fr` et `en` dès le départ) |
| Tests                   | **Vitest** + **Testing Library**                                     |
| Lint / format           | **ESLint** + **Prettier** (configuration stricte)                    |
| Rendu et validation des tracés | **Hanzi Writer** **derrière une abstraction** `CharacterRenderer` |
| PWA                     | Service worker + IndexedDB (Lot 5)                                   |
| Saisie stylet           | **Pointer Events** uniquement (jamais Touch ou Mouse seuls)          |

### Backend

| Brique         | Choix                                                                       |
|----------------|-----------------------------------------------------------------------------|
| Langage        | **Go 1.22+**                                                                |
| Routeur HTTP   | **chi** (remplaçable derrière `adapters/http/`)                             |
| Base de données | **SQLite** via **`modernc.org/sqlite`** (pas de cgo, build simplifié)      |
| Migrations SQL | **pressly/goose**                                                           |
| Lint           | **golangci-lint** en mode strict                                            |
| Tests          | **testify** pour la lisibilité                                              |
| Architecture   | Hexagonale : `internal/domain/`, `internal/ports/`, `internal/adapters/`    |

### Données de référence

- **Tracés** : [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) (MIT, ~9000 caractères avec chemins SVG par trait + lignes médianes).
- **Définitions** : CC-CEDICT (anglais, CC BY-SA) au démarrage.
- **Traductions françaises** : ajoutées progressivement à la main.
- **Liste HSK** : HSK 3.0 niveau 1 (300 caractères + 500 mots).

### Hébergement

- VPS personnel déjà disponible pour le backend Go et le service de fichiers statiques.
- Frontend déployé sur le même VPS ou ailleurs (à décider plus tard, pas bloquant pour le MVP).

## Conséquences

- **Tout est sobre, mature, monolangage côté front (TS) et back (Go)**. Pas de stack exotique à maintenir.
- **Hanzi Writer est utilisé pour démarrer vite** mais reste derrière un port `CharacterRenderer`. Si demain on veut le remplacer (par exemple par une implémentation custom), aucune autre partie du code ne bouge.
- **`modernc.org/sqlite` sans cgo** simplifie le build et le déploiement (binaire statique, cross-compilation facile).
- **TypeScript strict + Zod** : le typage compile-time est doublé d'une validation runtime aux frontières (lecture du JSON HSK, payloads API).
- **Vitest** plutôt que Jest : intégration native avec Vite, démarrage instantané, watch mode performant.
- **Chromium 111 sur Boox** : on peut s'appuyer sur les Pointer Events modernes, le service worker v2, les Web Locks, etc. Mais on évite les API les plus récentes (View Transitions, Container Queries niveau 2, etc.) sans polyfill.

## Alternatives considérées

- **Next.js / Remix** au lieu de Vite : refusé. SSR inutile pour une app perso PWA offline-first, complexité ajoutée non justifiée.
- **Svelte / Solid** : refusé. React est le plus universel, le mieux outillé, et le bénéfice d'une autre lib reste marginal pour un projet de cette taille.
- **Node.js / Rust côté backend** : refusé. Go offre le meilleur compromis entre simplicité, performance, et déploiement statique pour un service de persistance.
- **Postgres** côté backend : refusé. Overkill pour un mono-utilisateur. SQLite suffit largement et simplifie l'hébergement.
- **Lib de tracé maison** dès le début : refusé. Hanzi Writer est mature, MIT-licensed, et offre déjà la validation de l'ordre des traits. On capitalise dessus tout en gardant l'option de le remplacer.
- **gRPC** côté backend : refusé pour démarrer. REST suffit, mais l'architecture hexagonale permet d'ajouter `adapters/grpc/` plus tard sans toucher au domaine.
