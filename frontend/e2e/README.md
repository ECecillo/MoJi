# Tests end-to-end (Playwright)

Tests E2E qui exercent l'application complète dans un vrai navigateur Chromium. Cf. [RFC 0009](../../docs/rfc/0009-tests-e2e.md).

## Lancer

Depuis la racine du repo :

| Commande                  | Effet                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| `make test-e2e`           | Headless, exécution complète, reporter HTML dans `playwright-report/`. |
| `npm run test:e2e:headed` | Idem avec navigateur visible (utile pour debug).                       |
| `npm run test:e2e:ui`     | UI interactive Playwright (sélection des tests, timeline).             |

Le serveur Vite est lancé automatiquement (cf. `playwright.config.ts → webServer`). Si un `npm run dev` tourne déjà sur le port 5173, Playwright le réutilise en local.

## Convention

- Un fichier `.spec.ts` par scénario ou par flux utilisateur.
- Préférer `getByRole`, `getByLabel`, `getByTestId` (selectors accessibles).
- Sur les tests qui dispatchent des Pointer Events : utiliser `locator.dispatchEvent('pointerdown', { ... })` plutôt que `page.mouse.*` (Pointer Events est notre primitive, cf. RFC 0001).

## Discipline

- Pas obligatoire avant chaque commit (cycle plus lent que les unitaires).
- **Recommandé avant tout commit qui touche `features/`, `adapters/`, ou un flux utilisateur**.
- À enrichir au fil des features : un scénario par parcours majeur ajouté.
