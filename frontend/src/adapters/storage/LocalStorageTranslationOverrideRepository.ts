import type {
  EntryId,
  LanguageCode,
  OverrideMap,
  TranslationOverrideRepository,
} from '../../domain/ports/TranslationOverrideRepository';

/**
 * Adaptateur `localStorage` du port `TranslationOverrideRepository`.
 *
 * Stratégie de stockage : une seule clé versionnée qui contient un blob JSON
 * `{ schema_version, data: OverrideMap }`. Choix volontaire vs "une clé par
 * entrée" — c'est mono-utilisateur, le volume est petit (HSK 1 ~150 entrées,
 * quelques chaînes par entrée) et un blob unique simplifie les migrations
 * futures et l'export/import.
 *
 * Le format est validé à la lecture : si la version ne correspond pas ou que
 * la structure est cassée, on retourne un état vide plutôt que de crasher.
 * Le contenu utilisateur peut être perdu dans ces cas, mais c'est préférable
 * à un crash au boot. Une RFC ultérieure pourra introduire une migration
 * formelle quand la version sautera.
 */

const STORAGE_KEY = 'sinogrammes:translation_overrides';
const SCHEMA_VERSION = 1 as const;

interface StoredBlob {
  schema_version: number;
  data: OverrideMap;
}

export class LocalStorageTranslationOverrideRepository implements TranslationOverrideRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  async loadAll(): Promise<OverrideMap> {
    return this.readBlob();
  }

  async setForLanguage(entryId: EntryId, lang: LanguageCode, items: string[]): Promise<void> {
    const blob = this.readBlob();
    const cleaned = items.map((s) => s.trim()).filter((s) => s.length > 0);

    if (cleaned.length === 0) {
      // Supprimer la surcharge pour cette langue
      const existing = blob[entryId];
      if (existing) {
        const { [lang]: _removed, ...rest } = existing;
        if (Object.keys(rest).length === 0) {
          const { [entryId]: _droppedEntry, ...restEntries } = blob;
          this.writeBlob(restEntries);
        } else {
          this.writeBlob({ ...blob, [entryId]: rest });
        }
      }
      return;
    }

    const updated: OverrideMap = {
      ...blob,
      [entryId]: { ...(blob[entryId] ?? {}), [lang]: cleaned },
    };
    this.writeBlob(updated);
  }

  async clearForEntry(entryId: EntryId): Promise<void> {
    const blob = this.readBlob();
    if (!(entryId in blob)) return;
    const { [entryId]: _removed, ...rest } = blob;
    this.writeBlob(rest);
  }

  async clearAll(): Promise<void> {
    this.storage.removeItem(STORAGE_KEY);
  }

  private readBlob(): OverrideMap {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as Partial<StoredBlob>;
      if (parsed.schema_version !== SCHEMA_VERSION) return {};
      if (typeof parsed.data !== 'object' || parsed.data === null) return {};
      return parsed.data;
    } catch {
      return {};
    }
  }

  private writeBlob(data: OverrideMap): void {
    const blob: StoredBlob = { schema_version: SCHEMA_VERSION, data };
    this.storage.setItem(STORAGE_KEY, JSON.stringify(blob));
  }
}
