# RFC 0005 — Stratégie d'internationalisation

- **Statut** : Accepté
- **Date** : 2026-05-24
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0004 (format de données)

## Contexte

L'application doit gérer deux dimensions d'i18n très différentes :

1. **L'interface utilisateur** (boutons, labels, messages d'erreur, tooltips) : doit être disponible en français et en anglais. Locale par défaut : français.
2. **Les données pédagogiques** (traductions des caractères et mots) : chaque caractère et chaque mot a potentiellement plusieurs traductions dans plusieurs langues. CC-CEDICT fournit l'anglais ; l'utilisateur enrichit progressivement le français.

Confondre ces deux dimensions serait une erreur classique. La RFC les sépare explicitement.

## Décision

### Dimension 1 — i18n de l'interface

- Bibliothèque : **i18next** + **react-i18next**.
- Locales gérées **dès le Lot 0** : `fr`, `en`.
- Locale par défaut : `fr`.
- Détection automatique via `navigator.language`, override possible par l'utilisateur (toggle accessible dans l'UI).
- Fichiers de traduction : `frontend/src/i18n/locales/fr.json`, `frontend/src/i18n/locales/en.json`.
- Convention de clés hiérarchique (`canvas.brush.size`, `glossary.search.placeholder`, etc.).
- Aucune chaîne UI codée en dur dans les composants : tout passe par `t('clé')`.

### Dimension 2 — Multilangue des données

Intégré au **schéma de données** (cf. RFC 0004) via le champ `translations` indexé par code de langue :

```json
"translations": {
  "fr": ["tu", "toi"],
  "en": ["you"]
}
```

- Au démarrage : `translations.en` est peuplé automatiquement depuis CC-CEDICT.
- `translations.fr` est rempli **progressivement à la main** par l'utilisateur. Tant qu'une traduction française manque, on affiche un placeholder ou la traduction anglaise en fallback.
- Ajouter une nouvelle langue plus tard = ajouter une clé dans l'objet `translations`. **Pas de migration de schéma nécessaire** (c'est un changement de données, pas de structure).

### Articulation entre les deux dimensions

- La langue de l'interface (i18next) et la langue affichée pour les traductions sont **indépendantes par défaut**, mais peuvent être couplées par préférence utilisateur ("afficher les traductions dans la même langue que l'UI").
- L'utilisateur peut choisir explicitement quelle(s) langue(s) de traduction afficher dans le glossaire (par exemple : afficher français + anglais simultanément).

### Conventions linguistiques

- **Codes ISO 639-1** uniquement (`fr`, `en`, jamais `fra` / `eng`).
- Pluriel et formes complexes : `i18next` gère cela nativement via `count` et `context`. À utiliser dès qu'une chaîne dépend d'un nombre ou d'un genre.
- **Format des dates** : via `Intl.DateTimeFormat` avec la locale courante, jamais à la main.
- **Format du pinyin** : reste intact (pas localisable, c'est de la donnée linguistique).

## Conséquences

- **Pas de dette** : on installe i18next dès le Lot 0, même si la première version n'a que dix labels. Ajouter `i18next` à mi-projet est plus coûteux que de l'avoir dès le départ.
- **Extensible** : ajouter `de`, `es`, `zh` côté UI = nouveau fichier de locale + clé dans le toggle. Côté données = clé en plus dans `translations`.
- **Pas de fallback agressif** : si une traduction française manque dans les données, on affiche un signal explicite (ex. icône, texte grisé) plutôt que de masquer le manque.
- **Workflow d'enrichissement** : il faudra un mini-outil (UI, ou import CSV) pour saisir les traductions françaises confortablement. À planifier hors Lot 0 (probablement Lot 2 — glossaire).

## Alternatives considérées

- **Une seule dimension** (mélanger UI et données dans i18next) : refusé. i18next est conçu pour l'UI ; mettre 300 caractères × 5 langues dedans casse les outils (extraction de clés, vérification de couverture) et alourdit le bundle. Séparer est plus propre.
- **Pas d'i18n au début** ("on fera quand on en aura besoin") : refusé. Coût marginal très faible au Lot 0, coût élevé d'introduction tardive.
- **Traductions inlinées dans le bundle JS** : refusé. JSON externe + lazy load par locale = bundle initial plus léger.
- **Codes BCP 47 complets** (`fr-FR`, `en-US`) : refusé pour démarrer. ISO 639-1 suffit ; on basculera vers BCP 47 si on a besoin de distinguer variantes régionales.
