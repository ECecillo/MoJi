# Documentation du projet

Toute la documentation du projet vit ici, **en français** (sauf code, commentaires de code et termes techniques standards).

## Organisation

- [`rfc/`](rfc/) — Décisions structurantes (Request For Comments). Une RFC = une décision avec contexte, alternatives et conséquences. Numérotées et versionnées (cf. statuts dans [`rfc/README.md`](rfc/README.md)).
- [`journal/`](journal/) — Une entrée par session de travail (= grosso modo une conversation avec un LLM). Format léger, raconte ce qui a été fait, découvert et décidé.
- [`handoff/CURRENT_STATE.md`](handoff/CURRENT_STATE.md) — **L'état courant du projet**, mis à jour à la fin de chaque session. Point d'entrée pour reprendre la main.

## Comment naviguer

| Question                                                | Où aller                                  |
|---------------------------------------------------------|-------------------------------------------|
| Où en est le projet maintenant ?                        | `handoff/CURRENT_STATE.md`                |
| Pourquoi avons-nous choisi X ?                          | `rfc/` (cherche la RFC concernée)         |
| Qu'est-ce qui a été fait à telle date ?                 | `journal/` (entrée du jour)               |
| Quelle était la vision initiale du projet ?             | `../BRIEF.md` à la racine (figé)          |

## Conventions

- **Format des RFC** : voir l'en-tête type dans [`rfc/README.md`](rfc/README.md).
- **Format du journal** : voir [`journal/README.md`](journal/README.md).
- **Toute nouvelle décision structurante** = nouvelle RFC. Ne pas enterrer une décision dans un commit ou un message Slack.
- **Toute session de travail** = entrée de journal + mise à jour de `CURRENT_STATE.md`.
