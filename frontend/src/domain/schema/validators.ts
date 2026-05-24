import { z } from 'zod';

/**
 * Validateurs Zod du schéma de données de référence v1.
 * Doivent rester cohérents avec `shared/schema/data-schema.v1.json`
 * et avec les types TypeScript de `types.ts` (cf. RFC 0004).
 */

const semVerV1 = z.string().regex(/^1\.\d+\.\d+$/, 'schema_version doit commencer par 1.');

const languageCodeKey = z.string().regex(/^[a-z]{2}$/, 'code de langue ISO 639-1 attendu');

const pinyinSyllable = z
  .object({
    syllable: z.string().min(1),
    tone: z.number().int().min(0).max(4),
  })
  .strict();

const translations = z
  .record(languageCodeKey, z.array(z.string().min(1)).min(1))
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'translations doit contenir au moins une langue',
  });

export const characterSchema = z
  .object({
    id: z.string().regex(/^char_[A-Z0-9]+$/),
    hanzi: z.string().min(1).max(1),
    pinyin: z.array(pinyinSyllable).min(1),
    translations,
    hsk_level: z.number().int().min(1).max(9),
    stroke_count: z.number().int().min(1),
    radicals: z.array(z.string().min(1)),
    frequency_rank: z.number().int().min(1).optional(),
    tags: z.array(z.string()),
    stroke_data_ref: z.string().regex(/^[a-z]+:[A-Z0-9]+$/),
    metadata: z.record(z.string(), z.unknown()),
  })
  .strict();

const wordExample = z
  .object({
    hanzi: z.string().min(1),
    pinyin: z.array(pinyinSyllable).optional(),
    translations,
  })
  .strict();

export const wordSchema = z
  .object({
    id: z.string().regex(/^word_[a-z0-9_]+$/),
    hanzi: z.string().min(1),
    pinyin: z.array(pinyinSyllable).min(1),
    translations,
    hsk_level: z.number().int().min(1).max(9),
    character_refs: z.array(z.string().regex(/^char_[A-Z0-9]+$/)).min(1),
    examples: z.array(wordExample),
    tags: z.array(z.string()),
    metadata: z.record(z.string(), z.unknown()),
  })
  .strict();

export const deckSchema = z
  .object({
    id: z.string().regex(/^deck_[a-z0-9_]+$/),
    name: z.string().min(1),
    description: z.string().optional(),
    items: z.array(
      z
        .object({
          type: z.enum(['character', 'word']),
          ref: z.string().regex(/^(char|word)_[A-Za-z0-9_]+$/),
        })
        .strict(),
    ),
  })
  .strict();

export const referenceDataSchema = z
  .object({
    schema_version: semVerV1,
    characters: z.array(characterSchema),
    words: z.array(wordSchema),
    decks: z.array(deckSchema),
  })
  .strict();

export type ReferenceDataInput = z.input<typeof referenceDataSchema>;
export type ReferenceDataParsed = z.output<typeof referenceDataSchema>;
