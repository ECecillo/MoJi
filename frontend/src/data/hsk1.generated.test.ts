/**
 * Tests d'intégrité sur `hsk1.generated.json` — l'artefact produit par
 * `scripts/build-hsk1-data.ts`. Vérifient la conformité au schéma v1, les
 * comptes attendus (300 caractères / ~500 mots), l'unicité des IDs et la
 * cohérence référentielle entre mots et caractères.
 */

import { referenceDataSchema } from '../domain/schema/validators';
import generated from './hsk1.generated.json';

describe('hsk1.generated.json', () => {
  const parsed = referenceDataSchema.safeParse(generated);

  it('est conforme au schéma de référence v1', () => {
    if (!parsed.success) {
      throw new Error(
        `validation Zod échouée : ${parsed.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join('.')} → ${i.message}`)
          .join(' | ')}`,
      );
    }
    expect(parsed.data.schema_version).toBe('1.0.0');
  });

  if (!parsed.success) return;
  const data = parsed.data;

  describe('comptes attendus (HSK 3.0 niveau 1)', () => {
    it('contient exactement 300 caractères distincts', () => {
      expect(data.characters).toHaveLength(300);
      const hanziSet = new Set(data.characters.map((c) => c.hanzi));
      expect(hanziSet.size).toBe(300);
    });

    it('contient ~500 entrées de vocabulaire (border drkameleon 2026-03 : 506)', () => {
      expect(data.words.length).toBeGreaterThanOrEqual(500);
      expect(data.words.length).toBeLessThanOrEqual(520);
    });

    it('contient deux decks : mots et caractères', () => {
      const ids = data.decks.map((d) => d.id).sort();
      expect(ids).toEqual(['deck_hsk1_characters', 'deck_hsk1_words']);
    });

    it('le deck "characters" a 300 items, le deck "words" a autant que data.words', () => {
      const charsDeck = data.decks.find((d) => d.id === 'deck_hsk1_characters');
      const wordsDeck = data.decks.find((d) => d.id === 'deck_hsk1_words');
      expect(charsDeck?.items).toHaveLength(300);
      expect(wordsDeck?.items).toHaveLength(data.words.length);
    });
  });

  describe('intégrité référentielle', () => {
    it('tous les IDs de caractères sont uniques', () => {
      const ids = data.characters.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('tous les IDs de mots sont uniques', () => {
      const ids = data.words.map((w) => w.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('chaque character_refs pointe vers un caractère existant', () => {
      const knownCharIds = new Set(data.characters.map((c) => c.id));
      const orphans: string[] = [];
      for (const w of data.words) {
        for (const ref of w.character_refs) {
          if (!knownCharIds.has(ref)) orphans.push(`${w.id} → ${ref}`);
        }
      }
      expect(orphans).toEqual([]);
    });

    it('chaque item de deck pointe vers une entité existante', () => {
      const knownCharIds = new Set(data.characters.map((c) => c.id));
      const knownWordIds = new Set(data.words.map((w) => w.id));
      for (const deck of data.decks) {
        for (const item of deck.items) {
          if (item.type === 'character') expect(knownCharIds.has(item.ref)).toBe(true);
          else expect(knownWordIds.has(item.ref)).toBe(true);
        }
      }
    });
  });

  describe('contraintes métier', () => {
    it('tous les caractères ont hsk_level=1', () => {
      const offenders = data.characters.filter((c) => c.hsk_level !== 1);
      expect(offenders).toEqual([]);
    });

    it('tous les mots ont hsk_level=1', () => {
      const offenders = data.words.filter((w) => w.hsk_level !== 1);
      expect(offenders).toEqual([]);
    });

    it('chaque caractère a stroke_count ≥ 1 et un stroke_data_ref makemeahanzi', () => {
      for (const c of data.characters) {
        expect(c.stroke_count).toBeGreaterThanOrEqual(1);
        expect(c.stroke_data_ref).toMatch(/^makemeahanzi:[A-F0-9]+$/);
      }
    });

    it('chaque caractère a au moins une lecture pinyin', () => {
      const offenders = data.characters.filter((c) => c.pinyin.length === 0);
      expect(offenders).toEqual([]);
    });

    it('chaque caractère a une traduction anglaise non vide', () => {
      const offenders = data.characters.filter(
        (c) => !c.translations['en'] || c.translations['en'].every((t) => t.trim().length === 0),
      );
      expect(offenders).toEqual([]);
    });
  });

  describe('spot-check sur 你', () => {
    const ni = data.characters.find((c) => c.hanzi === '你');

    it('existe avec id char_4F60', () => {
      expect(ni).toBeDefined();
      expect(ni?.id).toBe('char_4F60');
    });

    it('a 7 traits', () => {
      expect(ni?.stroke_count).toBe(7);
    });

    it('a la lecture nǐ (tone 3)', () => {
      expect(ni?.pinyin).toContainEqual({ syllable: 'nǐ', tone: 3 });
    });

    it('a "亻" parmi ses radicaux', () => {
      expect(ni?.radicals).toContain('亻');
    });
  });
});
