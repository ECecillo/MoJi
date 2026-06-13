# 2026-06-13 — Clôture du Lot 5 et du MVP

## Objectif

Valider le dernier item du Lot 5 (test d'installation + sync réels sur le matériel
cible) et clôturer le Lot 5, donc le MVP (Lots 0 → 5).

## Validation matérielle (Boox Air 5c)

Serveur lancé via `make serve` (binaire Go servant `dist/` + API sur
`0.0.0.0:8787`, single-origin, cf. RFC 0011). Boox et ordinateur sur le même LAN,
app ouverte depuis `http://<ip-mac>:8787`. Vérifié OK :

- **Installation PWA** sur la Boox (icône, mode standalone).
- **Tracé au stylet** d'un caractère HSK 1 et d'un caractère HSK 2 (filtre par niveau).
- **Hors-ligne** : l'app se relance et fonctionne sans réseau (service worker).
- **Sync multi-appareils** : la progression faite sur un appareil se retrouve sur
  l'autre après reprise d'activité (merge par champ).

## État

🎉 **MVP complet — Lots 0 → 5 tous clôturés.** Critère de sortie du Lot 5 (RFC 0007)
atteint : installable sur Boox et ordinateur, 100 % offline, Lighthouse acceptable
(97 / 100 / 100). Couverture HSK 3.0 niveaux 1–2.

## Suite

Post-MVP uniquement (cf. RFC 0007 « Ce qui suit » et la section dédiée de
`CURRENT_STATE.md`) : données servies par le backend, export Anki, stats avancées,
HSK 3+, Docker/CI/déploiement, IndexedDB. Rien d'engagé.
