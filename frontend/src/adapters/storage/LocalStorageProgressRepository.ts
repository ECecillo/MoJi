import type {
  ProgressEntry,
  ProgressRepository,
  ProgressTargetRef,
} from '../../domain/ports/ProgressRepository';

/**
 * Adaptateur `localStorage` du port `ProgressRepository`.
 *
 * Stratégie de stockage : un blob JSON unique sous la clé
 * `sinogrammes:progress`, versionné par `schema_version`. Même choix que la
 * RFC 0010 pour les surcharges de traduction : parité, faible volume, export
 * simple. Cf. journal Lot 3 sprint 1 pour la justification de la déviation à
 * la RFC 0007 qui prévoyait IndexedDB.
 *
 * Le format est validé à la lecture : schéma absent ou version inconnue →
 * on retourne une map vide plutôt que de crasher. Le contenu utilisateur
 * peut être perdu dans ces cas, accepté pour le Lot 3 sprint 1.
 */

const STORAGE_KEY = 'sinogrammes:progress';
const SCHEMA_VERSION = 1 as const;

interface StoredBlob {
  schema_version: number;
  data: ProgressEntry[];
}

export class LocalStorageProgressRepository implements ProgressRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  async list(): Promise<ProgressEntry[]> {
    return this.readEntries();
  }

  async get(ref: ProgressTargetRef): Promise<ProgressEntry | null> {
    const entries = this.readEntries();
    return entries.find((e) => sameRef(e.ref, ref)) ?? null;
  }

  async upsert(entry: ProgressEntry): Promise<void> {
    await this.upsertBatch([entry]);
  }

  async upsertBatch(batch: ProgressEntry[]): Promise<void> {
    const entries = this.readEntries();
    for (const entry of batch) {
      const idx = entries.findIndex((e) => sameRef(e.ref, entry.ref));
      if (idx >= 0) {
        entries[idx] = entry;
      } else {
        entries.push(entry);
      }
    }
    this.writeEntries(entries);
  }

  async remove(ref: ProgressTargetRef): Promise<void> {
    const entries = this.readEntries();
    const next = entries.filter((e) => !sameRef(e.ref, ref));
    this.writeEntries(next);
  }

  private readEntries(): ProgressEntry[] {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as Partial<StoredBlob>;
      if (parsed.schema_version !== SCHEMA_VERSION) return [];
      if (!Array.isArray(parsed.data)) return [];
      return parsed.data;
    } catch {
      return [];
    }
  }

  private writeEntries(data: ProgressEntry[]): void {
    const blob: StoredBlob = { schema_version: SCHEMA_VERSION, data };
    this.storage.setItem(STORAGE_KEY, JSON.stringify(blob));
  }
}

function sameRef(a: ProgressTargetRef, b: ProgressTargetRef): boolean {
  return a.type === b.type && a.id === b.id;
}
