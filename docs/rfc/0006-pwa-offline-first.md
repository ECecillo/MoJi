# RFC 0006 — PWA et offline-first

- **Statut** : Accepté
- **Date** : 2026-05-24
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0001 (vision), RFC 0002 (stack), RFC 0004 (données), RFC 0007 (lots)

## Contexte

L'usage principal de l'application — pratique du tracé sur Boox Air 5c — a lieu **en mobilité**, souvent sans connexion réseau garantie (transports, week-ends, lieux mal couverts). De plus, la Boox peut rester offline plusieurs jours.

Un fonctionnement web classique (requête réseau à chaque interaction) est inutilisable dans ces conditions. L'application doit être **offline-first** par défaut : tout doit fonctionner sans réseau, et la connectivité n'est qu'un bonus pour la synchronisation.

## Décision

### Principe directeur : offline-first

- **Toute la logique métier tourne côté client** : validation de tracé, SRS, glossaire, statistiques. Aucun aller-retour serveur n'est nécessaire pour l'expérience normale.
- Le **backend est un simple service de persistance et de synchronisation**, jamais un point de passage obligé.
- La synchronisation est **best-effort** : la Boox peut rester offline plusieurs jours, tout se rattrape au prochain wifi.

### Données de référence : Option B (bundlées au build) pour le MVP

Deux options ont été identifiées pour servir les données HSK :

- **Option A** : servies par le backend, cachées par le service worker.
- **Option B** : bundlées dans le frontend au build.

**Choix pour le MVP** : **Option B**. Le JSON HSK 3.0 niveau 1 est embarqué dans le frontend au build. Avantages :

- Marche offline **dès la première ouverture**, sans même avoir besoin d'amorcer un cache.
- Pas de gestion de cache complexe au démarrage.
- Le backend reste minimal : il ne gère **que les données utilisateur** (progression, sessions).

À terme : migration possible vers l'Option A (servies par le backend, cachées par le service worker). À planifier mais **non prioritaire**. Le port `DataSource` (cf. RFC 0003) permet le basculement sans toucher au domaine.

### Données utilisateur : IndexedDB côté client, SQLite côté serveur

- **Côté client** : IndexedDB stocke la progression, l'état SRS, les sessions. Toutes les écritures sont locales et immédiates.
- **Côté serveur** : SQLite stocke les mêmes données (synchronisées) et permet de retrouver sa progression sur un autre appareil (par exemple, on a tracé sur la Boox, on révise sur l'ordi).
- **Synchronisation** : à introduire au Lot 3 quand le SRS arrive. Stratégie de fusion : **Last-Write-Wins par clé** au démarrage, suffisant pour un mono-utilisateur. À raffiner si nécessaire.

### Service worker et installabilité (Lot 5)

- **Manifest PWA** complet (icônes, couleurs, mode d'affichage `standalone`, theme adaptée e-ink).
- **Service worker** stratégie :
  - **Cache-first** pour les assets statiques (JS, CSS, fonts, images).
  - **Network-first avec fallback cache** pour les appels API.
  - Mise à jour du SW via prompt utilisateur (pas de rechargement intempestif au milieu d'une session).
- **Précaching** au premier chargement : tous les assets + le JSON HSK bundlé.
- **Pas de Background Sync** au démarrage (la sync au retour du focus suffit) ; à considérer plus tard.

### Conséquences pour l'architecture

- Le port `DataSource` (cf. RFC 0003) doit pouvoir être servi par **deux adapters** au cours de la vie du projet :
  - `BundledDataSource` (lit le JSON inclus au build) — Lot 1+.
  - `RemoteDataSource` (lit depuis le backend avec cache SW) — post-MVP.
- Le port `ProgressRepository` est exclusivement local (IndexedDB) côté front. La synchronisation est gérée par un service séparé (`SyncService` ou équivalent), pas confondue avec la persistance locale.

### Conséquences pour l'UX

- Toujours afficher un **indicateur de statut** discret (en ligne / hors ligne / sync en cours / dernière sync à HH:MM).
- Jamais bloquer l'utilisateur sur l'attente d'une réponse réseau.
- Les conflits de sync sont rarissimes (mono-utilisateur) mais doivent être détectables : on stocke un timestamp côté client et serveur.

## Conséquences

- **Délai d'introduction du service worker repoussé au Lot 5** : on peut développer l'app entière offline avec juste le JSON bundlé + IndexedDB. Le service worker est la cerise sur le gâteau (installabilité, performance au chargement).
- **Le backend reste très léger pendant longtemps** : il n'a presque rien à faire avant le Lot 3.
- **Discipline** : à chaque feature, se poser la question "et si on est offline ?" en premier. Si la réponse est "ça plante", c'est un bug de conception.

## Alternatives considérées

- **Online-first avec dégradation offline** : refusé. C'est l'inverse de l'usage réel ; rendrait l'app pénible sur Boox en mobilité.
- **Option A dès le MVP** (référence servie par le backend) : refusé. Complexité ajoutée au Lot 0 (cache management, gestion d'erreurs réseau) pour aucun bénéfice avant longtemps.
- **Pas de PWA, simple web app** : refusé. L'installabilité (icône, plein écran) est un confort majeur sur Boox.
- **Sync CRDT** : refusé pour le démarrage. Last-Write-Wins suffit largement pour un mono-utilisateur. CRDT envisageable si on ouvre un jour le multi-appareil simultané intensif.
