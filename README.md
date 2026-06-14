# Sinogrammes

Application web personnelle d'apprentissage des sinogrammes (caractères chinois), pensée pour la **pratique du tracé manuel au stylet** sur tablette e-ink Boox Air 5c, avec validation de l'ordre et de la direction des traits.

## Objectifs

- Apprendre les **300 caractères + 500 mots** de la liste HSK 3.0 niveau 1.
- S'entraîner au tracé sur tablette e-ink, sans dépendre d'une connexion réseau.
- Réviser ces caractères et mots via un système de répétition espacée.
- Consulter un glossaire trié et recherchable.

## Plateformes cibles

- **Tablette Boox Air 5c** (Android, Chromium 111, stylet Wacom) — usage principal pour le tracé.
- **Ordinateur (desktop / portable)** — révision et glossaire uniquement.
- Installable en **PWA**, fonctionne **offline-first**.

## Stack

| Côté     | Technologies                                                                          |
|----------|---------------------------------------------------------------------------------------|
| Frontend | Vite, React 18, TypeScript strict, Tailwind, Zod, i18next, Vitest, Hanzi Writer       |
| Backend  | Go 1.26.2, chi, SQLite (`modernc.org/sqlite`), goose, testify                         |
| Données  | JSON Schema partagé (`shared/schema/`), tracés [Make Me a Hanzi](https://github.com/skishore/makemeahanzi), définitions CC-CEDICT |

Architecture **hexagonale** des deux côtés. Toute dépendance externe est isolée derrière un port.

## Quick start

Le chemin recommandé passe par [`mise`](https://mise.jdx.dev/), qui installe les versions d'outils déclarées dans [`mise.toml`](mise.toml) : Node, Go et golangci-lint.

Prérequis hors projet : `mise` et `make`.

```sh
mise trust
mise install
mise run setup
make dev
```

`mise run setup` lance `make install` puis installe le navigateur Chromium utilisé par Playwright.

Sans mise, il faut installer manuellement Node 24.15.0, Go 1.26.2 et golangci-lint 2.9.0, puis lancer `make install`.

## Commandes projet

Toutes les commandes liées au projet sont centralisées dans le [`Makefile`](Makefile). Lancer `make help` depuis la racine pour voir les cibles disponibles.

## Déploiement auto-hébergé

Une seule image Docker sert la PWA **et** l'API (single-origin), avec la base SQLite sur un volume persistant. Cf. [RFC 0013](docs/rfc/0013-deploiement-docker.md).

```sh
docker compose up -d --build   # ou : make docker-up
```

L'app est alors accessible sur `http://<hôte>:8787`. Les données persistent dans le volume `sinogrammes-data`. Arrêt : `make docker-down`.

#### Raspberry Pi (arm64)

L'image est multi-arch (le binaire Go est cross-compilé vers l'arch cible). Deux options :

- **Builder sur le Pi** (le plus simple) : `git clone` sur le Pi puis `docker compose up -d --build` → image arm64 native.
- **Cross-builder depuis un autre poste** puis transférer (plus rapide que builder sur le Pi) :
  ```sh
  make docker-buildx-arm64                       # produit sinogrammes-arm64.tar
  scp sinogrammes-arm64.tar pi@raspberrypi:~/
  ssh pi@raspberrypi 'docker load -i sinogrammes-arm64.tar'
  ```
  Côté Pi, lancer via un compose qui référence `image: sinogrammes:arm64` (au lieu de `build: .`) + le volume `/data`.

### Sécurité & accès Tailscale (cf. [RFC 0014](docs/rfc/0014-securite-api.md))

L'API peut être protégée par un **jeton d'accès** partagé :

1. Générer un secret et le placer dans un fichier `.env` (cf. [`.env.example`](.env.example)) :
   ```sh
   echo "SINO_API_TOKEN=$(openssl rand -base64 32)" > .env
   docker compose up -d
   ```
   Vide = API ouverte (à réserver à un LAN de confiance).
2. **Accès chiffré via Tailscale** : sur l'hôte, exposer le conteneur en HTTPS dans le tailnet :
   ```sh
   tailscale serve --https=443 http://127.0.0.1:8787
   ```
   L'app est alors sur `https://<machine>.<tailnet>.ts.net`, accessible depuis n'importe où, chiffrée.
3. Sur chaque appareil (Boox, ordinateur), ouvrir l'app puis saisir le jeton dans **Tableau de bord → Synchronisation**.

> ℹ️ **HTTPS est requis pour l'offline/PWA** : le service worker ne s'enregistre que sur `localhost` ou en HTTPS. Sur une IP LAN en HTTP nu, l'app marche en ligne mais sans mode hors-ligne — d'où l'intérêt de `tailscale serve` (HTTPS).

## Documentation

- [`BRIEF.md`](BRIEF.md) — brief de cadrage initial, figé.
- [`CLAUDE.md`](CLAUDE.md) — instructions pour Claude Code.
- [`docs/`](docs/) — RFC, journal de bord, état courant.
- [`docs/handoff/CURRENT_STATE.md`](docs/handoff/CURRENT_STATE.md) — **point d'entrée pour reprendre** : ce qui se passe maintenant.

## Statut

**MVP complet (Lots 0→5)** : tracé, glossaire (HSK 1–2), révision SRS, sync multi-appareils, synthèse vocale, PWA installable et offline. Déploiement auto-hébergé Docker + CI en place. Voir `CURRENT_STATE.md` pour le détail et les pistes post-MVP.

## Licence

Projet personnel, non publié. Pas de licence définie pour l'instant.
