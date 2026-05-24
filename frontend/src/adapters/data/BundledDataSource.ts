import type { DataSource } from '../../domain/ports/DataSource';
import type { Character, Deck, ReferenceData, Word } from '../../domain/schema/types';
import { referenceDataSchema } from '../../domain/schema/validators';

/**
 * Adaptateur `BundledDataSource` — implémente le port `DataSource` en lisant
 * un blob de données déjà embarqué dans le bundle frontend (cf. RFC 0006,
 * Option B). Le blob est validé via Zod à la première lecture, puis mis en
 * cache. Si la validation échoue, l'adapter lève `BundledDataSourceError`.
 *
 * Le blob est injecté via le constructeur, pas importé en dur, pour rester
 * testable et permettre de plugger d'autres sources statiques au besoin.
 */
export class BundledDataSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BundledDataSourceError';
  }
}

export class BundledDataSource implements DataSource {
  private cached: ReferenceData | null = null;

  constructor(private readonly raw: unknown) {}

  async load(): Promise<ReferenceData> {
    if (this.cached !== null) return this.cached;
    const parsed = referenceDataSchema.safeParse(this.raw);
    if (!parsed.success) {
      const summary = parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.') || '<root>'} → ${issue.message}`)
        .join(' | ');
      const extra =
        parsed.error.issues.length > 3 ? ` (+${parsed.error.issues.length - 3} autres)` : '';
      throw new BundledDataSourceError(`données non conformes au schéma v1 : ${summary}${extra}`);
    }
    this.cached = parsed.data as unknown as ReferenceData;
    return this.cached;
  }

  async characters(): Promise<Character[]> {
    return (await this.load()).characters;
  }

  async words(): Promise<Word[]> {
    return (await this.load()).words;
  }

  async decks(): Promise<Deck[]> {
    return (await this.load()).decks;
  }
}
