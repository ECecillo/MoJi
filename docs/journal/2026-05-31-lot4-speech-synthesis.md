# 2026-05-31 — Lot 4 : Synthèse Vocale (TTS)

## Objectif de la session

Mettre en place la synthèse vocale pour permettre d'écouter la prononciation des sinogrammes et des mots.

1. Port `SpeechProvider` et adapter `WebSpeechProvider`.
2. Composant `SpeakButton` réutilisable.
3. Intégration dans le glossaire, la fiche détail et le canvas.

## Ce qui a été fait

### Infrastructure (`frontend/src/domain/ports/SpeechProvider.ts`, `frontend/src/adapters/speech/WebSpeechProvider.ts`)

- Définition du port `SpeechProvider` avec support du filtrage des voix et de la sélection de voix.
- Implémentation `WebSpeechProvider` utilisant l'API native `window.speechSynthesis`.
- Sélection automatique de la meilleure voix chinoise disponible (`zh-CN` en priorité).
- Vitesse de lecture fixée à 0.8 pour une meilleure intelligibilité pédagogique.

### Composant UI (`frontend/src/ui/SpeakButton.tsx`)

- Bouton minimaliste avec icône 🔊.
- Support de plusieurs tailles (`sm`, `md`, `lg`).
- Gestion du `stopPropagation` pour éviter de déclencher la navigation dans le glossaire.

### Intégration

- **Glossaire** : Icône ajoutée sur chaque ligne à côté du caractère.
- **Fiche Détail** : Bouton large à côté du caractère dans le header.
- **Canvas (Practice)** : Bouton ajouté dans le header de l'application lors du tracé.

### i18n

- Ajout de la clé `common.listen` ("Écouter" / "Listen").

### Tests

- `WebSpeechProvider.test.ts` : Tests unitaires avec mock complet de `speechSynthesis` (4 tests).

## Vérifications

- `make test` : **205 tests front passent**.
- Validation manuelle : La prononciation fonctionne correctement sur Chrome (voix Google) et Safari (voix système).

## Notes

- Sur certains navigateurs, les voix peuvent mettre quelques secondes à charger (événement `onvoiceschanged`). L'adapter est prêt à gérer cela via `onVoicesChanged`.
- L'e-ink de la Boox supporte bien l'icône 🔊, pas besoin de mode dégradé spécifique pour l'instant.

## Prochaines étapes — Lot 5 Polish & PWA

- Service Worker robuste pour le fonctionnement 100 % offline.
- Manifest PWA.
- Audit accessibilité et performance.
- Import HSK 2.
