/**
 * Types TypeScript du schéma de données de référence v1.
 * Source de vérité : `shared/schema/data-schema.v1.json` (cf. RFC 0004).
 *
 * Ces types sont écrits à la main et validés à l'exécution par les schémas Zod
 * de `validators.ts`. Si le JSON Schema évolue, les deux doivent être mis à jour.
 */

export type SchemaVersion = `${number}.${number}.${number}`;

export type LanguageCode = string; // ISO 639-1, deux lettres minuscules

export interface PinyinSyllable {
  syllable: string;
  /** 0 = neutre, 1..4 = tons 1 à 4. */
  tone: 0 | 1 | 2 | 3 | 4;
}

export type Translations = Record<LanguageCode, string[]>;

export interface Character {
  id: `char_${string}`;
  hanzi: string;
  pinyin: PinyinSyllable[];
  translations: Translations;
  hsk_level: number;
  stroke_count: number;
  radicals: string[];
  frequency_rank?: number;
  tags: string[];
  /** Référence externe vers la source des tracés, ex. "makemeahanzi:4F60". */
  stroke_data_ref: string;
  /** Champs futurs non normés. À utiliser avec parcimonie. */
  metadata: Record<string, unknown>;
}

export interface WordExample {
  hanzi: string;
  pinyin?: PinyinSyllable[];
  translations: Translations;
}

export interface Word {
  id: `word_${string}`;
  hanzi: string;
  pinyin: PinyinSyllable[];
  translations: Translations;
  hsk_level: number;
  character_refs: Array<`char_${string}`>;
  examples: WordExample[];
  tags: string[];
  metadata: Record<string, unknown>;
}

export type DeckItemType = 'character' | 'word';

export interface DeckItem {
  type: DeckItemType;
  ref: string;
}

export interface Deck {
  id: `deck_${string}`;
  name: string;
  description?: string;
  items: DeckItem[];
}

export interface ReferenceData {
  schema_version: SchemaVersion;
  characters: Character[];
  words: Word[];
  decks: Deck[];
}
