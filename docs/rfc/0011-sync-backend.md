# RFC 0011 — Synchronisation backend de la progression

- **Statut** : Accepté
- **Date** : 2026-06-13
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0003 (hexagonale), RFC 0006 (offline-first), RFC 0007 (découpage en lots — clôture du Lot 3)

## Contexte

Le critère de sortie du Lot 3 (cf. RFC 0007) est : « faire une session de révision
quotidienne **et retrouver sa progression sur un autre appareil après sync** ».
L'infrastructure existait déjà (backend SQLite, `GET/POST /api/progress`, port
`SyncClient` + `RestSyncClient`, auto-sync dans `useProgress`), mais trois trous
empêchaient la sync de fonctionner réellement :

1. **Aucune accessibilité du backend** : pas de proxy en dev (le front sur `:5173`
   appelait `/api` qui tapait Vite, pas `:8787`) ; le binaire Go ne servait pas le
   front → aucun hôte commun aux deux appareils en production.
2. **Résolution de conflits naïve** : `UpsertBatch` écrasait inconditionnellement,
   et le client adoptait le distant sur pull → le travail local plus avancé pouvait
   être perdu lors d'un pull de données périmées.
3. **Déclencheurs limités** : sync au chargement et après session seulement.

Cette RFC formalise la stratégie de sync mono-utilisateur, offline-first, qui clôt
le Lot 3.

## Décision

### Déploiement single-origin

Le binaire Go sert **le front bundlé (`dist/`) et l'API sur une seule origine**.
Activé par la variable d'environnement `SINO_STATIC_DIR` (vide = désactivé, le
serveur n'expose alors que `/health` et `/api/*`). Les routes inconnues retombent
sur `index.html` (SPA fallback) ; `/health` et `/api/progress` gardent la priorité.

Conséquence opérationnelle : on lance **un seul artefact** sur un hôte joignable par
les deux appareils (ex. l'ordinateur sur le LAN, `SINO_HOST=0.0.0.0`). La Boox et
l'ordinateur ouvrent cette URL, installent la PWA depuis là, et l'API est
**same-origin** (zéro CORS, aucune URL d'API à configurer). En dev, un proxy Vite
`/api → 127.0.0.1:8787` rétablit la parité pour `make dev`.

### Protocole de sync

Inchangé dans sa forme, best-effort et silencieux hors-ligne (un échec se journalise
en `console.debug`, jamais `console.error` — le backend est optionnel) :

1. **pull** du serveur (`GET /api/progress`) ;
2. **merge** par champ avec l'état local ;
3. **push** de l'état mergé complet (`POST /api/progress`), que le serveur re-merge.

Déclencheurs : au chargement initial, après chaque session de révision, et au retour
d'activité de l'app (`focus`, `visibilitychange` visible, `online`). Une garde
anti-concurrence évite d'empiler des cycles simultanés.

### Résolution de conflits : merge par champ, sans horodatage

Pour une même entrée (`ref`) présente des deux côtés, le record **le plus avancé**
est adopté **en entier** :

- plus d'`attempts` gagne ;
- à `attempts` égaux, le `last_seen` le plus récent gagne (dates ISO comparables).

Le record entier est adopté (pas de mélange de champs) pour garder un état SRS
cohérent. Les refs présentes d'un seul côté sont conservées. La règle est
**symétrique client (`lib/progressMerge.ts`) et serveur (clause `WHERE` sur l'upsert
SQLite)**, donc commutative : l'ordre de synchronisation n'a pas d'importance.

**Schéma de données inchangé** : pas d'`updated_at`, donc pas de migration ni de bump
SemVer (cf. RFC 0004). C'est volontairement plus simple qu'un last-write-wins
horodaté, qui dépendrait de l'horloge des appareils.

## Conséquences

- Le critère de sortie du Lot 3 est atteint : la progression se retrouve sur un autre
  appareil après sync.
- **Limite assumée** : les `attempts` ne sont **pas sommés** entre appareils (on prend
  le max). Si le même caractère est étudié indépendamment sur deux appareils entre
  deux syncs, on conserve le plus avancé sans additionner — sans perte de progression
  dans le cas réaliste mono-utilisateur, et sans la complexité d'un CRDT.
- Le serveur reste un **service de persistance et de sync**, jamais un point de passage
  obligé (cf. RFC 0006) : l'app fonctionne entièrement hors-ligne, la sync est un bonus
  quand l'hôte est joignable.
- Le binaire doit tourner sur un hôte accessible aux deux appareils (`SINO_HOST=0.0.0.0`
  en LAN). Cible `make serve` fournie (build front + lancement single-origin).

## Alternatives considérées

- **Last-write-wins horodaté** (`updated_at`) : rejeté pour cette itération. Ajoute une
  migration de schéma et fait dépendre la correction de l'horloge des appareils, pour
  un bénéfice marginal en mono-utilisateur.
- **Front et API hébergés séparément** (URL d'API configurable + CORS) : rejeté. Plus de
  pièces mobiles (config, CORS, deux déploiements) sans bénéfice pour un usage personnel.
- **CRDT / sommation des compteurs** : sur-ingénierie pour un mono-utilisateur ; reporté
  si un réel besoin multi-appareils concurrent apparaît.
