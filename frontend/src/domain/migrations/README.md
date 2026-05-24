# domain/migrations/

Migrations de schéma de données côté client. Cf. [RFC 0004](../../../../docs/rfc/0004-format-de-donnees-et-versioning.md).

## Convention

Une migration est un objet exporté :

```ts
import type { Migration } from './index';

export const migration_1_0_0__1_1_0: Migration = {
  from: '1.0.0',
  to: '1.1.0',
  migrate(oldData) {
    return {
      ...oldData,
      schema_version: '1.1.0',
      // nouveaux champs / transformations
    };
  },
};
```

À chaque ajout :

1. Créer un fichier `v1_0_0_to_v1_1_0.ts` (par exemple) qui exporte la migration.
2. L'ajouter à `REGISTERED_MIGRATIONS` dans `index.ts`, dans l'ordre des versions.
3. **Écrire un test obligatoire** `v1_0_0_to_v1_1_0.test.ts` : fixture entrée → fixture sortie, vérification champ par champ.

## Règles

- **Avant d'appliquer une migration en production**, sauvegarder l'ancien format dans une clé séparée d'IndexedDB (responsabilité de l'appelant, pas de l'orchestrateur).
- Une migration **ne supprime jamais** silencieusement des données. Si une donnée doit disparaître, c'est explicite dans le code et documenté.
- **MINOR** = ajout de champs optionnels uniquement. **MAJOR** = changement cassant.
- Les migrations PATCH n'existent pas (PATCH = aucun changement structurel).

## État

Aucune migration enregistrée (Lot 0). L'orchestrateur est en place et testé sur des migrations factices, pour figer le contrat.
