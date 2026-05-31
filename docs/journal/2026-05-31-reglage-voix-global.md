# 2026-05-31 — Réglage global de la voix

## Objectif de la session

Permettre de choisir une voix de synthèse chinoise une seule fois et de réutiliser ce choix partout dans l'application.

## Ce qui a été fait

- Ajout d'un contexte vocal partagé dans `frontend/src/features/speech/` :
  - `SpeechSettingsProvider` centralise le `SpeechProvider`.
  - `SpeechSettingsContext` expose `voices`, `selectedVoiceUri`, `setSelectedVoiceUri` et `speak`.
  - La voix choisie est persistée dans `localStorage` sous `sinogrammes:speech:voice-uri`.
- Ajout d'un sélecteur compact `VoiceSelect` dans l'en-tête de l'application.
- `SpeakButton` consomme désormais le contexte global au lieu de créer son propre `WebSpeechProvider`.
- `WebSpeechProvider` est plus robuste :
  - absence de `speechSynthesis` tolérée ;
  - `setVoice(null)` réactive la sélection automatique ;
  - si une voix persistée n'existe plus, fallback vers `zh-CN`, puis vers une autre voix `zh-*`.
- i18n FR/EN ajoutée pour le réglage de voix.

## Tests

- Tests unitaires ajoutés pour `SpeechSettingsProvider` et `VoiceSelect`.
- Tests `WebSpeechProvider` étendus pour la voix disparue et le retour à la sélection automatique.
- Test d'intégration `App` ajouté : sélection d'une voix globale puis lecture via un bouton `SpeakButton`.
- Vérifications projet : `env -u GOROOT make test`, `env -u GOROOT make lint`, `make typecheck`, `env -u GOROOT make test-e2e`, `make docs`.

## Décisions prises

- Le réglage est global à l'application, pas local à chaque bouton d'écoute.
- La persistance reste locale (`localStorage`) comme les autres préférences mono-utilisateur actuelles.
- Le sélecteur ne liste que les voix `zh-*`, conformément au périmètre HSK chinois.

## Reste à faire / prochaines étapes

- Vérifier sur la Boox Air 5c quelles voix chinoises Android/Chrome exposent réellement à l'API `SpeechSynthesis`.
