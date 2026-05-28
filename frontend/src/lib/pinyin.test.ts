import { describe, it, expect } from 'vitest';
import { pinyinToAscii, pinyinToString } from './pinyin';

describe('pinyinToString', () => {
  it('convertit les tons de base', () => {
    expect(pinyinToString([{ syllable: 'ni', tone: 3 }])).toBe('nǐ');
    expect(pinyinToString([{ syllable: 'hao', tone: 3 }])).toBe('hǎo');
    expect(pinyinToString([{ syllable: 'ma', tone: 0 }])).toBe('ma');
  });

  it('gère les mots multi-syllabiques', () => {
    expect(
      pinyinToString([
        { syllable: 'xue', tone: 2 },
        { syllable: 'xi', tone: 2 },
      ]),
    ).toBe('xuéxí');
  });

  it("place l'accent correctement selon les règles (priorité a > e > o)", () => {
    expect(pinyinToString([{ syllable: 'hui', tone: 4 }])).toBe('huì');
    expect(pinyinToString([{ syllable: 'piao', tone: 4 }])).toBe('piào');
    expect(pinyinToString([{ syllable: 'shuo', tone: 1 }])).toBe('shuō');
  });
});

describe('pinyinToAscii', () => {
  it('strippe les diacritiques pour la recherche', () => {
    expect(pinyinToAscii([{ syllable: 'nǐ', tone: 3 }])).toBe('ni');
    expect(
      pinyinToAscii([
        { syllable: 'nǐ', tone: 3 },
        { syllable: 'hǎo', tone: 3 },
      ]),
    ).toBe('nihao');
  });

  it('laisse intacte une syllabe sans diacritique (ton neutre)', () => {
    expect(pinyinToAscii([{ syllable: 'ma', tone: 0 }])).toBe('ma');
  });

  it('strippe aussi le tréma de ü pour permettre la recherche au clavier ASCII', () => {
    // L'utilisateur tape "nu" sur son clavier, pas "nǚ". On accepte donc la
    // perte du tréma pour la recherche, même si l'affichage du glossaire
    // conserve la diacritique via `pinyinToString`.
    expect(pinyinToAscii([{ syllable: 'nǚ', tone: 3 }])).toBe('nu');
  });
});
