import { describe, expect, it } from 'vitest';
import { mergeTranslations } from './translations';

describe('mergeTranslations', () => {
  it('retourne base inchangé si pas de surcharge', () => {
    const base = { en: ['you'] };
    expect(mergeTranslations(base, undefined)).toEqual(base);
  });

  it('ajoute une langue absente du bundle', () => {
    const base = { en: ['you'] };
    expect(mergeTranslations(base, { fr: ['tu', 'toi'] })).toEqual({
      en: ['you'],
      fr: ['tu', 'toi'],
    });
  });

  it('remplace intégralement une langue déjà présente dans le bundle', () => {
    const base = { en: ['you (informal)', 'thou'] };
    expect(mergeTranslations(base, { en: ['you'] })).toEqual({ en: ['you'] });
  });

  it('garde les langues non touchées par la surcharge', () => {
    const base = { en: ['you'], zh: ['你'] };
    expect(mergeTranslations(base, { fr: ['tu'] })).toEqual({
      en: ['you'],
      zh: ['你'],
      fr: ['tu'],
    });
  });

  it('ignore une langue dont la liste de surcharge est vide (retombe sur bundle)', () => {
    const base = { en: ['you'] };
    expect(mergeTranslations(base, { en: [] })).toEqual({ en: ['you'] });
  });

  it("ne mute pas l'objet base", () => {
    const base = { en: ['you'] };
    const baseCopy = { en: ['you'] };
    mergeTranslations(base, { fr: ['tu'] });
    expect(base).toEqual(baseCopy);
  });
});
