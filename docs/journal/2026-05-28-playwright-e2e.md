# 2026-05-28 — Tests E2E Playwright + correction race condition StrictMode

## Objectif de la session

Ajouter un framework de tests E2E (Playwright) pour sécuriser les flux utilisateur et permettre à l'agent IA de piloter un vrai navigateur via MCP. La RFC 0009 fige les choix structurants ; cette session pose l'outillage, les premiers scénarios, et corrige au passage un bug latent découvert grâce à E2E.

## Ce qui a été fait

### Tooling Playwright
- `@playwright/test` installé en devDependency, navigateur Chromium téléchargé (~150 MB, cache global `~/Library/Caches/ms-playwright/`).
- `frontend/playwright.config.ts` : Chromium seul, `webServer` qui lance Vite automatiquement (ré-utilise un dev server existant en local), traces et screenshots on-failure, reporter HTML.
- Scripts npm `test:e2e`, `test:e2e:headed`, `test:e2e:ui`.
- Cible `make test-e2e` séparée de `make test` (cycle dev rapide préservé).
- `.gitignore` met de côté `test-results/`, `playwright-report/`, `blob-report/`.
- `.prettierignore` et override ESLint pour `e2e/**`.

### Scénarios E2E (5 fichiers, 10 tests)
- `smoke.spec.ts` (2 tests) : chargement de l'app, glossaire visible, locale FR par défaut, ≥100 caractères listés.
- `glossary.spec.ts` (3 tests) : recherche pinyin ASCII trouve les diacritiques, message vide pour `xyz123`, bascule onglets caractères ↔ mots.
- `navigation.spec.ts` (1 test) : glossary → Tracer → practice → bouton retour → glossary.
- `language.spec.ts` (2 tests) : toggle FR/EN, placeholder change, double toggle revient.
- `canvas.spec.ts` (2 tests) : un trait Pointer Events fait apparaître un verdict, une polyline du trait reste dans le SVG.

### Bug latent corrigé — race condition StrictMode dans Canvas

Les tests E2E ont révélé un bug invisible côté unit : sous React StrictMode (dev), la première `renderer.mount()` peut résoudre **après** son cleanup. Son `.then()` voit alors `cancelled=true` et appelle `renderer.unmount()` — mais l'instance de renderer est **partagée** avec la 2ᵉ `mount()` déjà en cours, donc l'unmount tardif clobber le `_quiz` du 2ᵉ writer fraîchement créé. Symptôme : `data-renderer-mounted="true"` est affiché mais `renderer.validateStroke()` lève `HanziWriterRendererError: quiz n'est pas prêt` au premier trait.

Le bug existait depuis le Lot 1 mais ne se manifestait pas en usage normal car les humains ne tracent pas dans la première 10aine de ms après l'arrivée sur la vue practice. Les tests E2E, eux, dispatchent immédiatement après le signal de mount.

Correctif : retirer `renderer.unmount()` de la branche `cancelled` du `.then()`. Le cleanup du useEffect (`return () => { renderer.unmount() }`) s'occupe déjà du démontage réel. Commentaire explicite dans le code pour ne pas régresser.

### Diagnostic et instrumentation temporaires

Pour identifier le bug, j'ai dû :
- Capturer la console du navigateur dans le test (`page.on('console')` + `page.on('pageerror')`).
- Ajouter brièvement des `console.log` dans `Canvas.startStroke` et `Canvas.finishStroke` (retirés après diagnostic).
- Wrapper `event.currentTarget.setPointerCapture()` et `releasePointerCapture()` en try/catch — l'API peut lever sur des PointerEvent synthétiques (test) ; conservé car résilience utile en production aussi.
- Ajouter un signal `data-renderer-mounted` sur la couche d'input pour gate les tests E2E pendant le mount async de Hanzi Writer.

### Découvertes Playwright

- `page.mouse.*` passe par CDP `Input.dispatchMouseEvent` qui **n'émet pas de PointerEvent**, seulement des mouse events. Pour tester nos handlers `onPointerDown/Move/Up`, on dispatch nous-mêmes les PointerEvent via `locator.evaluate((el, ...) => el.dispatchEvent(new PointerEvent(...)))`.
- Le `<svg>` du trait user est `aria-hidden="true"` (décoratif). Playwright considère ses enfants comme "hidden" pour `toBeVisible`. Utiliser `toBeAttached` à la place quand on vérifie la présence d'un élément aria-hidden.

## Décisions prises

- [RFC 0009 — Stratégie de tests end-to-end](../rfc/0009-tests-e2e.md) actée.
- `make test-e2e` reste **séparée** de `make test` ; recommandé avant push mais pas obligatoire pour chaque commit (les unitaires couvrent l'essentiel rapidement).
- Le scénario canvas ne teste **pas** si le verdict est accepté ou refusé (dépend de la géométrie réelle évaluée par Hanzi Writer, fragile). Il vérifie uniquement la chaîne `pointer → validateStroke → verdict → DOM`.
- MCP Playwright à installer côté machine utilisateur — pas une dépendance du repo (cf. RFC 0009 + instructions ci-dessous).

## Vérifications

- `make test` : 92 tests front, backend `-race` vert.
- `make test-e2e` : **10/10 tests E2E verts** (Chromium, ~10s d'exécution).
- `make lint` : ESLint + Prettier propres, golangci-lint 0 issue.
- `make typecheck` : `tsc --noEmit` propre.
- `make docs` : 9 RFC + 10 entrées de journal.

## Installation du MCP Playwright (à faire côté machine utilisateur)

Le serveur MCP `@playwright/mcp` permet à Claude Code de piloter un navigateur Playwright en interactif (utile pour reproduire des bugs, valider une UI sans rebuild). Il n'est **pas** une dépendance du repo.

Ajouter dans `~/.claude/settings.json` (ou équivalent selon la config locale) :

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

Redémarrer Claude Code. Les outils `mcp__playwright__*` devraient apparaître dans la liste.

## Reste à faire / prochaines étapes

- **Reprendre étape 4 du Lot 2** : fiches détaillées des caractères / mots dans le glossaire (modale, page dédiée ou panneau latéral — à arbitrer).
- À chaque feature majeure : ajouter un scénario E2E correspondant pour figer le flux utilisateur.
- Considérer un test E2E qui vérifie le **bug original** (premier trait disparait après un toggle outline) — maintenant qu'on a le fix, on a tout pour le verrouiller.
