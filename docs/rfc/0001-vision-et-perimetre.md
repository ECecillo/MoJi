# RFC 0001 — Vision et périmètre

- **Statut** : Accepté
- **Date** : 2026-05-24
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0007 (découpage en lots)

## Contexte

Apprendre les sinogrammes nécessite trois choses dont peu d'applications grand public couvrent l'intersection :

1. **Tracer manuellement** les caractères dans le bon ordre, avec la bonne direction de traits — c'est la mémorisation kinesthésique qui ancre durablement la forme.
2. **Réviser** régulièrement (répétition espacée).
3. **Disposer d'un glossaire** propre, navigable, multilingue.

L'utilisateur dispose d'une **tablette Boox Air 5c** (e-ink couleur, stylet Wacom). Aucune application existante n'offre simultanément une bonne expérience de tracé sur cette plateforme, une révision propre et une consultation glossaire fluide. D'où la décision de construire une application personnelle, sur mesure.

## Décision

### Vision produit

Application web personnelle, **mono-utilisateur**, dédiée à l'apprentissage des sinogrammes HSK 3.0 niveau 1 (300 caractères + 500 mots). L'usage principal est la **pratique du tracé au stylet sur Boox Air 5c**. Les usages secondaires sont la révision (sur tablette, ordinateur, téléphone) et la consultation d'un glossaire.

### Périmètre fonctionnel

Quatre fonctionnalités cibles :

1. **Canvas de tracé** avec :
   - Modes d'affichage du modèle : semi-transparent (guide) ou caché (test).
   - Grilles d'aide optionnelles : Tian Zi Ge (田字格), Mi Zi Ge (米字格), Hui Zi Ge (回字格).
   - **Validation de l'ordre et de la direction des traits** — fonctionnalité centrale, non négociable.
2. **Révision** type Anki (répétition espacée).
3. **Mode vocal** : prononciation des caractères et mots via la synthèse vocale du navigateur.
4. **Glossaire** consultable de tous les caractères et mots.

### Plateformes cibles

- **Tablette Boox Air 5c** (Android, Chromium 111, stylet Wacom) : usage principal pour le tracé. Recommandation : installer Chrome depuis le Play Store plutôt que d'utiliser le navigateur Boox natif.
- **Ordinateur (desktop / portable)** : usage secondaire, révision et glossaire uniquement. Pas de tracé à la souris.
- **PWA installable**, **offline-first**.

### Contraintes liées à l'e-ink

Le rendu sur e-ink (Boox Air 5c) impose :

- Refresh rate lent, ghosting marqué.
- Minimalisme visuel obligatoire.
- Animations rares ou désactivables.
- Respect de `prefers-reduced-motion` et `prefers-contrast` partout.

### Hors périmètre (au moins pour le MVP)

- Pas d'authentification, pas de multi-utilisateur (à la limite des profils locaux plus tard).
- Pas de social, pas de partage, pas de classement.
- Pas d'export/import Anki (envisageable post-MVP).
- Pas de HSK 2+ au démarrage (HSK 3.0 niveau 1 seulement).

## Conséquences

- **Discipline e-ink** dès la première ligne de CSS : noir/blanc/contraste, peu de transitions, pas d'animations gratuites.
- **Stylet first** : on conçoit le tracé pour Pointer Events / stylet Wacom, pas pour la souris ou le doigt.
- **Offline-first** : tout fonctionne sans réseau, le backend est un simple service de sync (cf. RFC 0006).
- **Pas de bottleneck d'auth** : on peut se concentrer sur la valeur d'usage.
- **Cadrage produit clair** : pas de risque de scope creep vers du social ou des fonctionnalités tierces.

## Alternatives considérées

- **Réutiliser une app existante** (Skritter, Pleco, Anki + add-ons) : refusé. Aucune n'offre simultanément une bonne UX e-ink, une validation rigoureuse de l'ordre des traits, et un mode personnalisable. Beaucoup sont payantes et fermées.
- **App native Android** : refusé. Le web couvre tous les besoins, est installable en PWA, et reste portable vers d'autres plateformes (ordinateur) sans effort.
- **Multi-utilisateur dès le départ** : refusé. Le coût (auth, autorisations, hébergement multi-tenant) n'est pas justifié pour un usage personnel. On garde l'option de profils locaux côté front sans authentification.
