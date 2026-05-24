/**
 * Orchestrateur de migrations de schéma de données (côté client).
 *
 * Convention (cf. RFC 0004) :
 *   - Une migration = un objet `{ from, to, migrate(oldData) -> newData }`.
 *   - L'orchestrateur détecte la version courante d'un blob de données
 *     (champ `schema_version`), applique en chaîne les migrations nécessaires
 *     jusqu'à la version cible, puis renvoie le résultat.
 *   - Le backup de l'ancien format est de la responsabilité de l'appelant
 *     (typiquement : sauvegarde dans une clé séparée d'IndexedDB avant l'appel).
 *
 * À ce stade (Lot 0), aucune migration n'est encore enregistrée. L'orchestrateur
 * est en place avec des tests de bout-en-bout sur des migrations factices, pour
 * verrouiller le contrat avant que les vraies migrations n'arrivent.
 */

export type SemVer = `${number}.${number}.${number}`;

export interface Migration<TFrom = unknown, TTo = unknown> {
  from: SemVer;
  to: SemVer;
  migrate(oldData: TFrom): TTo;
}

export interface VersionedBlob {
  schema_version: SemVer;
  [key: string]: unknown;
}

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * Applique les migrations nécessaires pour amener `blob.schema_version` à `targetVersion`.
 * Lève `MigrationError` si aucun chemin n'existe.
 */
export function applyMigrations<T extends VersionedBlob>(
  blob: T,
  migrations: ReadonlyArray<Migration>,
  targetVersion: SemVer,
): VersionedBlob {
  let current: VersionedBlob = blob;
  const visited = new Set<SemVer>();

  while (current.schema_version !== targetVersion) {
    if (visited.has(current.schema_version)) {
      throw new MigrationError(
        `boucle de migration détectée à partir de ${current.schema_version}`,
      );
    }
    visited.add(current.schema_version);

    const next = migrations.find((m) => m.from === current.schema_version);
    if (!next) {
      throw new MigrationError(
        `aucune migration disponible depuis ${current.schema_version} vers ${targetVersion}`,
      );
    }

    const migrated = next.migrate(current) as Record<string, unknown>;
    if (migrated['schema_version'] !== next.to) {
      throw new MigrationError(
        `la migration ${next.from} → ${next.to} doit mettre schema_version à ${next.to}, reçu ${String(migrated['schema_version'])}`,
      );
    }

    current = migrated as VersionedBlob;
  }

  return current;
}

/**
 * Registre principal des migrations. Vide pour l'instant ; les nouvelles
 * migrations doivent être ajoutées ici dans l'ordre des versions.
 */
export const REGISTERED_MIGRATIONS: ReadonlyArray<Migration> = [];
