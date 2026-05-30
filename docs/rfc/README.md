# RFC — Request For Comments

Une RFC documente **une décision structurante** : contexte, décision, conséquences, alternatives considérées. Elle est numérotée et a un statut explicite.

## Index

| #     | Titre                                                                 | Statut    | Date       |
|-------|-----------------------------------------------------------------------|-----------|------------|
| 0001  | [Vision et périmètre](0001-vision-et-perimetre.md)                    | Accepté   | 2026-05-24 |
| 0002  | [Stack technique](0002-stack-technique.md)                            | Accepté   | 2026-05-24 |
| 0003  | [Architecture hexagonale](0003-architecture-hexagonale.md)            | Accepté   | 2026-05-24 |
| 0004  | [Format de données et versioning](0004-format-de-donnees-et-versioning.md) | Accepté | 2026-05-24 |
| 0005  | [Stratégie d'internationalisation](0005-strategie-i18n.md)            | Accepté   | 2026-05-24 |
| 0006  | [PWA et offline-first](0006-pwa-offline-first.md)                     | Accepté   | 2026-05-24 |
| 0007  | [Découpage en lots](0007-decoupage-en-lots.md)                        | Accepté   | 2026-05-24 |
| 0008  | [Sourcing des données HSK 3.0 niveau 1](0008-sourcing-hsk1.md)        | Accepté   | 2026-05-24 |
| 0009  | [Stratégie de tests end-to-end (Playwright)](0009-tests-e2e.md)       | Accepté   | 2026-05-28 |

## Statuts possibles

- **Brouillon** — en cours de rédaction, pas encore tranché.
- **Accepté** — décision prise, en vigueur.
- **Remplacé** — supplanté par une RFC ultérieure (mettre le lien dans l'en-tête).
- **Abandonné** — décision rétractée sans remplaçant.

## En-tête type

Toute RFC commence par cet en-tête :

```markdown
# RFC NNNN — Titre

- **Statut** : Brouillon | Accepté | Remplacé | Abandonné
- **Date** : AAAA-MM-JJ
- **Auteur(s)** : ...
- **Lié à** : RFC NNNN, ...
- **Remplace** : RFC NNNN (le cas échéant)

## Contexte
## Décision
## Conséquences
## Alternatives considérées
```

## Convention de nommage des fichiers

`NNNN-titre-en-kebab-case.md`, où `NNNN` est un numéro à quatre chiffres incrémental. Une fois attribué, un numéro ne change plus, même si la RFC est abandonnée.
