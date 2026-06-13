import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  getLearningStatus,
  isFilterActive,
  matchesFilters,
  uniqueTagsOf,
  type GlossaryFilters,
} from './glossaryFilters';
import type { Character, Word } from '../domain/schema/types';
import type { ProgressEntry } from '../domain/ports/ProgressRepository';

function makeChar(partial: Partial<Character> = {}): Character {
  return {
    id: 'char_4F60',
    hanzi: '你',
    pinyin: [{ syllable: 'nǐ', tone: 3 }],
    translations: { en: ['you'] },
    hsk_level: 1,
    stroke_count: 7,
    radicals: ['亻', '尔'],
    frequency_rank: 100,
    tags: [],
    stroke_data_ref: 'makemeahanzi:4F60',
    metadata: {},
    ...partial,
  };
}

function makeWord(partial: Partial<Word> = {}): Word {
  return {
    id: 'word_4f60',
    hanzi: '你',
    pinyin: [{ syllable: 'nǐ', tone: 3 }],
    translations: { en: ['you'] },
    hsk_level: 1,
    character_refs: [],
    examples: [],
    tags: [],
    metadata: {},
    ...partial,
  };
}

describe('getLearningStatus', () => {
  const today = new Date('2026-05-30');
  const item = makeChar({ id: 'char_1' });

  it('retourne "new" si aucune progression', () => {
    expect(getLearningStatus(item, undefined, today)).toBe('new');
  });

  it('retourne "due" si l\'item est dû', () => {
    const progress: ProgressEntry = {
      ref: { type: 'character', id: 'char_1' as any },
      srs_state: { due: '2026-05-30', interval_days: 1, ease: 2.5 },
      stats: { attempts: 1, successes: 1, last_seen: '2026-05-29' },
    };
    expect(getLearningStatus(item, progress, today)).toBe('due');
  });

  it('retourne "mastered" si l\'intervalle >= 30', () => {
    const progress: ProgressEntry = {
      ref: { type: 'character', id: 'char_1' as any },
      srs_state: { due: '2026-06-30', interval_days: 30, ease: 2.5 },
      stats: { attempts: 10, successes: 10, last_seen: '2026-05-30' },
    };
    expect(getLearningStatus(item, progress, today)).toBe('mastered');
  });

  it('retourne "learning" sinon', () => {
    const progress: ProgressEntry = {
      ref: { type: 'character', id: 'char_1' as any },
      srs_state: { due: '2026-06-05', interval_days: 5, ease: 2.5 },
      stats: { attempts: 2, successes: 2, last_seen: '2026-05-30' },
    };
    expect(getLearningStatus(item, progress, today)).toBe('learning');
  });
});

describe('matchesFilters', () => {
  it("accepte un item quand aucun filtre n'est défini", () => {
    expect(matchesFilters(makeChar(), {})).toBe(true);
  });

  it('filtre par stroke_count [min, max]', () => {
    const c = makeChar({ stroke_count: 5 });
    expect(matchesFilters(c, { strokeCount: { min: 4 } })).toBe(true);
    expect(matchesFilters(c, { strokeCount: { min: 6 } })).toBe(false);
    expect(matchesFilters(c, { strokeCount: { max: 5 } })).toBe(true);
    expect(matchesFilters(c, { strokeCount: { max: 4 } })).toBe(false);
    expect(matchesFilters(c, { strokeCount: { min: 4, max: 6 } })).toBe(true);
  });

  it('filtre par frequency_rank [min, max]', () => {
    const c = makeChar({ frequency_rank: 100 });
    expect(matchesFilters(c, { frequencyRank: { min: 50 } })).toBe(true);
    expect(matchesFilters(c, { frequencyRank: { max: 50 } })).toBe(false);
    expect(matchesFilters(c, { frequencyRank: { min: 50, max: 200 } })).toBe(true);
  });

  it('exclut un caractère sans frequency_rank quand un filtre fréquence est posé', () => {
    // On construit explicitement sans frequency_rank (exactOptionalPropertyTypes)
    const base = makeChar();
    const { frequency_rank: _omitted, ...rest } = base;
    const c = rest as typeof base;
    expect(matchesFilters(c, { frequencyRank: { min: 100 } })).toBe(false);
  });

  it('filtre par niveau HSK : seul le niveau sélectionné matche', () => {
    const c1 = makeChar({ hsk_level: 1 });
    const c2 = makeChar({ hsk_level: 2 });
    expect(matchesFilters(c1, { hskLevels: new Set([1]) })).toBe(true);
    expect(matchesFilters(c2, { hskLevels: new Set([1]) })).toBe(false);
    expect(matchesFilters(c2, { hskLevels: new Set([1, 2]) })).toBe(true);
    // Set vide = filtre inactif
    expect(matchesFilters(c2, { hskLevels: new Set() })).toBe(true);
  });

  it('filtre par tags : au moins un tag sélectionné doit matcher', () => {
    const c = makeChar({ tags: ['numbers', 'time'] });
    expect(matchesFilters(c, { tags: new Set(['numbers']) })).toBe(true);
    expect(matchesFilters(c, { tags: new Set(['family']) })).toBe(false);
    expect(matchesFilters(c, { tags: new Set(['family', 'numbers']) })).toBe(true);
    // Set vide = filtre inactif
    expect(matchesFilters(c, { tags: new Set() })).toBe(true);
  });

  it('ignore stroke_count et frequency_rank pour les mots', () => {
    const w = makeWord({ tags: ['family'] });
    // Un word n'a pas de stroke_count → matchesFilters ignore ces axes
    expect(
      matchesFilters(w, {
        strokeCount: { min: 1, max: 2 },
        frequencyRank: { min: 1, max: 2 },
      }),
    ).toBe(true);
    expect(matchesFilters(w, { tags: new Set(['family']) })).toBe(true);
    expect(matchesFilters(w, { tags: new Set(['numbers']) })).toBe(false);
  });

  it('combine plusieurs filtres en ET', () => {
    const c = makeChar({ stroke_count: 5, frequency_rank: 100, tags: ['t1'] });
    const filters: GlossaryFilters = {
      strokeCount: { min: 4, max: 6 },
      frequencyRank: { min: 50, max: 200 },
      tags: new Set(['t1']),
    };
    expect(matchesFilters(c, filters)).toBe(true);

    expect(matchesFilters(makeChar({ stroke_count: 100 }), filters)).toBe(false);
  });

  it("filtre par statut d'apprentissage", () => {
    const item = makeChar({ id: 'char_1' as any });
    const today = new Date('2026-05-30');

    // Cas "new"
    expect(matchesFilters(item, { status: new Set(['new']) }, undefined, today)).toBe(true);
    expect(matchesFilters(item, { status: new Set(['learning']) }, undefined, today)).toBe(false);

    // Cas "due"
    const progress: ProgressEntry = {
      ref: { type: 'character', id: 'char_1' as any },
      srs_state: { due: '2026-05-30', interval_days: 1, ease: 2.5 },
      stats: { attempts: 1, successes: 1, last_seen: '2026-05-29' },
    };
    expect(matchesFilters(item, { status: new Set(['due']) }, progress, today)).toBe(true);
    expect(matchesFilters(item, { status: new Set(['new']) }, progress, today)).toBe(false);
  });
});

describe('isFilterActive', () => {
  it('false sur un objet vide', () => {
    expect(isFilterActive({})).toBe(false);
    expect(isFilterActive({ tags: new Set(), strokeCount: { min: null }, frequencyRank: {} })).toBe(
      false,
    );
  });

  it("true dès qu'au moins un axe est défini", () => {
    expect(isFilterActive({ tags: new Set(['x']) })).toBe(true);
    expect(isFilterActive({ strokeCount: { min: 1 } })).toBe(true);
    expect(isFilterActive({ frequencyRank: { max: 100 } })).toBe(true);
  });
});

describe('activeFilterCount', () => {
  it("compte le nombre d'axes actifs", () => {
    expect(activeFilterCount({})).toBe(0);
    expect(activeFilterCount({ tags: new Set(['a']) })).toBe(1);
    expect(
      activeFilterCount({
        tags: new Set(['a']),
        strokeCount: { min: 1 },
        frequencyRank: { max: 10 },
      }),
    ).toBe(3);
  });
});

describe('uniqueTagsOf', () => {
  it('retourne la liste triée et dédupliquée des tags présents', () => {
    const items = [
      makeChar({ tags: ['b', 'a'] }),
      makeChar({ tags: ['a', 'c'] }),
      makeChar({ tags: [] }),
    ];
    expect(uniqueTagsOf(items)).toEqual(['a', 'b', 'c']);
  });

  it('retourne [] sur un set vide', () => {
    expect(uniqueTagsOf([])).toEqual([]);
  });
});
