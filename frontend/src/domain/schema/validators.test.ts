import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { characterSchema, deckSchema, referenceDataSchema, wordSchema } from './validators';

const fixturePath = resolve(__dirname, '../../../../shared/schema/examples/hsk1_sample.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as unknown;

describe('referenceDataSchema', () => {
  it('valide la fixture HSK 1 partagée', () => {
    const result = referenceDataSchema.safeParse(fixture);
    if (!result.success) {
      throw new Error(`fixture invalide : ${result.error.message}`);
    }
    expect(result.data.schema_version).toBe('1.0.0');
    expect(result.data.characters.length).toBeGreaterThan(0);
  });

  it('rejette une schema_version non v1', () => {
    const bad = { ...(fixture as Record<string, unknown>), schema_version: '2.0.0' };
    expect(referenceDataSchema.safeParse(bad).success).toBe(false);
  });

  it('rejette un champ inconnu au top niveau (strict)', () => {
    const bad = { ...(fixture as Record<string, unknown>), unknown_field: 42 };
    expect(referenceDataSchema.safeParse(bad).success).toBe(false);
  });
});

describe('characterSchema', () => {
  const validCharacter = {
    id: 'char_4F60',
    hanzi: '你',
    pinyin: [{ syllable: 'nǐ', tone: 3 }],
    translations: { fr: ['tu', 'toi'], en: ['you'] },
    hsk_level: 1,
    stroke_count: 7,
    radicals: ['亻', '尔'],
    frequency_rank: 8,
    tags: [],
    stroke_data_ref: 'makemeahanzi:4F60',
    metadata: {},
  };

  it('accepte un caractère valide', () => {
    expect(characterSchema.safeParse(validCharacter).success).toBe(true);
  });

  it('accepte un caractère sans frequency_rank (optionnel)', () => {
    const { frequency_rank: _omit, ...withoutRank } = validCharacter;
    expect(characterSchema.safeParse(withoutRank).success).toBe(true);
  });

  it('rejette un id mal préfixé', () => {
    expect(characterSchema.safeParse({ ...validCharacter, id: 'bad_4F60' }).success).toBe(false);
  });

  it('rejette un ton hors plage [0..4]', () => {
    const bad = { ...validCharacter, pinyin: [{ syllable: 'nǐ', tone: 5 }] };
    expect(characterSchema.safeParse(bad).success).toBe(false);
  });

  it('rejette un hanzi vide ou multi-caractère', () => {
    expect(characterSchema.safeParse({ ...validCharacter, hanzi: '' }).success).toBe(false);
    expect(characterSchema.safeParse({ ...validCharacter, hanzi: '你好' }).success).toBe(false);
  });

  it('rejette des translations vides', () => {
    expect(characterSchema.safeParse({ ...validCharacter, translations: {} }).success).toBe(false);
  });

  it('rejette une langue mal formée (clé non ISO 639-1)', () => {
    const bad = { ...validCharacter, translations: { FRA: ['tu'] } };
    expect(characterSchema.safeParse(bad).success).toBe(false);
  });

  it('rejette un champ inconnu (strict)', () => {
    const bad = { ...validCharacter, unknown_field: 42 } as unknown;
    expect(characterSchema.safeParse(bad).success).toBe(false);
  });
});

describe('wordSchema', () => {
  const validWord = {
    id: 'word_nihao',
    hanzi: '你好',
    pinyin: [
      { syllable: 'nǐ', tone: 3 },
      { syllable: 'hǎo', tone: 3 },
    ],
    translations: { fr: ['bonjour'], en: ['hello'] },
    hsk_level: 1,
    character_refs: ['char_4F60', 'char_597D'],
    examples: [],
    tags: [],
    metadata: {},
  };

  it('accepte un mot valide', () => {
    expect(wordSchema.safeParse(validWord).success).toBe(true);
  });

  it('rejette un character_ref mal formé', () => {
    const bad = { ...validWord, character_refs: ['bad_4F60'] };
    expect(wordSchema.safeParse(bad).success).toBe(false);
  });

  it('rejette character_refs vide', () => {
    const bad = { ...validWord, character_refs: [] };
    expect(wordSchema.safeParse(bad).success).toBe(false);
  });
});

describe('deckSchema', () => {
  it('rejette un deck.item.type inconnu', () => {
    const bad = {
      id: 'deck_test',
      name: 'Test',
      items: [{ type: 'sentence', ref: 'char_4F60' }],
    };
    expect(deckSchema.safeParse(bad).success).toBe(false);
  });
});
