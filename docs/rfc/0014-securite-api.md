# RFC 0014 — Authentification de l'API et accès Tailscale

- **Statut** : Accepté
- **Date** : 2026-06-14
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0011 (sync backend), RFC 0013 (déploiement Docker)

## Contexte

RFC 0013 a livré le déploiement auto-hébergé mais a laissé l'API `/api/progress`
**ouverte** (« réseau de confiance uniquement »). Pour un déploiement chez soi accessible
hors LAN, deux besoins : (1) **authentifier** l'API pour que la progression ne soit ni
lisible ni modifiable sans secret ; (2) un **transport chiffré**. L'utilisateur accède
via **Tailscale** (VPN maillé chiffré), ce qui répond au point 2 sans reverse-proxy.

## Décision

### Jeton d'accès partagé, opt-in

Application **mono-utilisateur** → un **jeton partagé** suffit (pas d'OAuth ni de
multi-comptes). Variable d'environnement backend **`SINO_API_TOKEN`** :

- **vide → authentification désactivée** (dev, `make serve`, LAN de confiance — comportement
  RFC 0013 inchangé) ;
- **non vide → `/api/*` exige `Authorization: Bearer <token>`** (comparaison
  **constant-time**, `crypto/subtle`). `/health` et les fichiers statiques (shell PWA)
  restent **publics** : le healthcheck doit fonctionner sans secret, et la donnée
  sensible est derrière le jeton.

Côté client, le jeton est **saisi une fois par appareil** (réglage « Synchronisation » du
tableau de bord), stocké en `localStorage` (`sinogrammes:sync:api-token`) et envoyé en
en-tête par `RestSyncClient` sur chaque requête (lu à chaque appel → changement pris en
compte sans rechargement). Un échec `401` est remonté à l'UI (statut de sync).

### Transport : Tailscale + HTTPS

Le serveur reste joignable via **Tailscale** ; on expose le conteneur en HTTPS dans le
tailnet avec **`tailscale serve`** → `https://<machine>.<tailnet>.ts.net`. C'est important
au-delà du chiffrement du jeton : le **service worker** (offline/PWA) ne s'enregistre que
dans un **secure context** (HTTPS ou `localhost`). Une IP LAN en HTTP nu (ex.
`http://192.168.x.x`) **ne permet pas** l'enregistrement du SW — donc pas de vrai mode
hors-ligne. Tailscale HTTPS fournit ce contexte sûr **et** chiffre le jeton de bout en bout,
sans exposition publique ni domaine.

## Conséquences

- Déploiement sécurisé pour un usage perso nomade : `SINO_API_TOKEN` défini + Tailscale.
- Rétro-compatibilité totale : sans `SINO_API_TOKEN`, rien ne change (dev/LAN).
- Le shell PWA reste public (sans secret on charge l'app mais on ne peut pas synchroniser) —
  acceptable, la donnée est protégée.
- `docker-compose.yml` lit `SINO_API_TOKEN` depuis l'hôte / `.env` (`.env.example` fourni,
  `.env` gitignoré).

## Limites (assumées, mono-utilisateur)

- **Un seul jeton**, pas de rotation automatique ni de révocation par appareil. Pour
  changer le secret : mettre à jour `SINO_API_TOKEN` côté serveur et le re-saisir sur
  chaque appareil.
- Pas de rate-limiting ni de verrouillage : suffisant derrière Tailscale (pas d'exposition
  publique). Une exposition publique (reverse-proxy) nécessiterait en plus du rate-limiting.

## Alternatives considérées

- **Reverse-proxy Caddy + domaine public + HTTPS** : écarté au profit de Tailscale (plus
  simple, pas de surface publique). L'option reste documentée si besoin futur.
- **Sessions / cookies / OAuth** : sur-dimensionné pour un mono-utilisateur.
- **Jeton injecté dans le HTML servi** : rejeté (exposerait le secret à quiconque charge la
  page) ; le jeton est saisi et stocké côté appareil.
