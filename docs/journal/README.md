# Journal de bord

Une entrée par **session de travail** (grosso modo une conversation avec un LLM ou une session de codage focalisée). Le journal raconte ce qui s'est passé, ce qui a été décidé, ce qui reste à faire.

## Pourquoi

Reprendre un projet après plusieurs jours/semaines coûte cher en remise en contexte. Le journal réduit ce coût à zéro : on relit la dernière entrée, on enchaîne. Couplé à `CURRENT_STATE.md` (état courant) et aux RFC (décisions structurantes), il forme la mémoire vivante du projet.

## Format

Un fichier par session, nommé `AAAA-MM-JJ-titre-court-kebab.md`. S'il y a plusieurs sessions dans la même journée : suffixer (`AAAA-MM-JJ-titre-1.md`, `-2.md`).

Contenu type :

```markdown
# AAAA-MM-JJ — Titre court

## Objectif de la session
## Ce qui a été fait
## Découvertes / surprises
## Décisions prises (lien vers RFC si formalisé)
## Reste à faire / prochaines étapes
```

## Discipline

- Une entrée à chaque session, même courte. Mieux vaut trois lignes que rien.
- Si une décision structurante émerge : ouvrir une nouvelle RFC, et **citer la RFC** dans la section "Décisions prises".
- Mettre à jour `../handoff/CURRENT_STATE.md` à la fin de chaque session (en cohérence avec l'entrée du jour).

## Index (par date décroissante)

- [2026-05-24 — Lot 0, fondations en place](2026-05-24-lot0-fondations.md)
- [2026-05-24 — Initialisation du projet](2026-05-24-init-projet.md)
