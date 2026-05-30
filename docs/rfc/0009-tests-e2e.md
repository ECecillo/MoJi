# RFC 0009 — Stratégie de tests end-to-end

- **Statut** : Accepté
- **Date** : 2026-05-28
- **Auteur(s)** : Enzo
- **Lié à** : RFC 0001 (vision), RFC 0002 (stack), RFC 0006 (offline-first)

## Contexte

Les tests unitaires Vitest couvrent bien la logique pure (domaine, helpers, validateurs Zod) et les composants isolés via Testing Library. Mais plusieurs bugs récents — disparition du trait au démarrage du suivant, recherche glossaire diacritique-sensible — ont été détectés **manuellement à l'usage** sur la Boox, après commit. Le projet manque d'un filet de sécurité au niveau du **comportement bout-en-bout** : "quand l'utilisateur fait X, le navigateur affiche Y".

L'ajout d'une couche E2E vise à :
- Détecter en amont les régressions de flux utilisateur (navigation, recherche, tracé).
- Documenter par l'exemple les parcours utilisateur attendus.
- Permettre à l'agent IA de **piloter un vrai navigateur** via MCP pour vérifier ses propres modifications, sans qu'on aille systématiquement sur la Boox.

## Décision

### Framework

**Playwright** (`@playwright/test`), choisi pour :
- API moderne, support natif de Pointer Events (indispensable pour tester le canvas).
- Auto-wait robuste, sélecteurs accessibilité (`getByRole`, `getByTestId`).
- WebServer intégré (lance Vite automatiquement avant les tests).
- Excellent rapport HTML + traces interactives pour le debug.
- **Existence d'un MCP officiel `@playwright/mcp`** qui permet à l'agent IA de piloter un navigateur Playwright en live.

### Périmètre du runner

- **Chromium seul** au démarrage. Cohérent avec la cible Boox Air 5c (Chromium 111). Pas de WebKit ni Firefox tant que la PWA ne vise pas explicitement ces moteurs.
- Tests headless en local, possible passage en mode `headed` via `npm run test:e2e:headed` pour debug.
- Pas d'intégration CI tant que CI n'existe pas (cf. brief section 12 — Docker/CI hors scope du MVP).

### Localisation

- `frontend/e2e/` pour les fichiers `*.spec.ts`.
- `frontend/playwright.config.ts` à la racine du frontend.
- Tests E2E **séparés des tests Vitest** : extensions distinctes (`.spec.ts` pour E2E, `.test.ts` ou `.test.tsx` pour Vitest), répertoires distincts.

### Intégration Makefile

- **Nouvelle cible `make test-e2e`** séparée de `make test`. Justification : les E2E prennent ~20-30s minimum (lancement de Chromium + Vite). Les inclure dans `make test` ralentirait le cycle de dev rapide. À lancer manuellement avant un push ou un commit important.
- `make test` reste dédié aux unitaires (Vitest + `go test`).
- Discipline dans `CLAUDE.md` : `make test-e2e` recommandé avant tout commit qui touche `features/`, `adapters/`, ou les flux utilisateur.

### Scénarios initiaux

1. **Smoke** : l'app charge, le glossaire est visible, locale FR par défaut.
2. **Glossaire** : recherche par pinyin ASCII trouve un caractère diacritique, recherche sans résultat affiche le message vide, bascule onglet caractères ↔ mots.
3. **Navigation** : glossaire → bouton "Tracer" → vue practice → bouton retour → retour glossaire.
4. **Langue** : toggle FR → EN met à jour les labels visibles.
5. **Canvas tracé** : un pointer event séquence (down → move → up) déclenche un verdict affiché et incrémente le compteur correspondant.

Le scénario 5 n'asserte **pas** "accepté" vs "refusé" (dépend de la géométrie réelle évaluée par Hanzi Writer, fragile sans coordonnées exactes). Il valide uniquement que la chaîne `pointer → validateStroke → setVerdict → DOM` fonctionne de bout en bout.

### MCP Playwright

Le serveur MCP `@playwright/mcp` permet à l'agent IA Claude Code de piloter un navigateur Playwright sans passer par les tests E2E figés. Utile en cours de session pour :
- Reproduire visuellement un bug rapporté.
- Vérifier qu'une modification d'UI rend bien à l'écran.
- Itérer sur des choix de design sans rebuild complet.

**Configuration** : ajouter dans `~/.claude/settings.json` (ou équivalent selon ton harnais) :

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Le MCP n'est **pas** une dépendance du repo : c'est un outil de la machine de l'utilisateur. Il complète les tests E2E mais ne les remplace pas — les tests E2E sont la source de vérité, le MCP est un outil de debug interactif.

## Conséquences

- **Cycle de feedback plus long** mais plus robuste : avant un push, on lance `make test-e2e` pour valider les flux principaux.
- **Surface à maintenir augmente** : les tests E2E sont plus fragiles que les unitaires (changements de DOM = casse). On garde l'ensemble petit (5 scénarios au départ).
- **Dépendance binaire ajoutée** : ~150 MB pour Chromium Playwright, installé hors du repo (cache global `~/Library/Caches/ms-playwright/` sur macOS).
- **Pas de bonne couverture sans CI** : tant que CI n'existe pas, les E2E sont à la discrétion du développeur. À automatiser quand on introduira Docker/CI.

## Alternatives considérées

- **Cypress** : refusé. API moins moderne, support Pointer Events historiquement limité, écosystème plus lourd.
- **WebdriverIO + Selenium** : refusé. Surdimensionné, lent, mauvaise DX face à Playwright.
- **Tests E2E avec Vitest + jsdom** : refusé. Jsdom ne simule pas un vrai navigateur (pas de layout, pas de vrai Pointer Event, pas de focus management). Les tests Vitest restent unitaires.
- **Ne rien ajouter** ("on continue à tester à la main sur la Boox") : refusé. Les bugs récents ont montré le coût du test manuel + délai entre commit et détection.
- **Couvrir tous les flux dès le départ** : refusé. 5 scénarios = bon démarrage, on ajoute au fil des features sans gros lot dédié.
