/**
 * Tests d'intégrité sur `hsk2.generated.json` — l'extension HSK 2 produite par
 * `scripts/build-hsk1-data.ts` (cf. RFC 0012). Vérifient la conformité au schéma,
 * les comptes attendus (caractères/mots exclusifs au niveau 2), le niveau, et
 * l'intégrité référentielle **inter-fichiers** : un mot HSK 2 peut référencer un
 * caractère HSK 1 (qui vit dans `hsk1.generated.json`).
 */

import { referenceDataSchema } from '../domain/schema/validators';
import generatedHsk1 from './hsk1.generated.json';
import generatedHsk2 from './hsk2.generated.json';

describe('hsk2.generated.json', () => {
  const parsed = referenceDataSchema.safeParse(generatedHsk2);

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

  it('contient 298 caractères exclusifs HSK 2, tous hsk_level=2', () => {
    expect(data.characters).toHaveLength(298);
    expect(data.characters.every((c) => c.hsk_level === 2)).toBe(true);
  });

  it('contient ~750 mots exclusifs HSK 2, tous hsk_level=2', () => {
    expect(data.words.length).toBeGreaterThanOrEqual(700);
    expect(data.words.length).toBeLessThanOrEqual(800);
    expect(data.words.every((w) => w.hsk_level === 2)).toBe(true);
  });

  it('a les decks deck_hsk2_characters / deck_hsk2_words', () => {
    expect(data.decks.map((d) => d.id).sort()).toEqual(['deck_hsk2_characters', 'deck_hsk2_words']);
  });

  it('n’a aucun caractère ni mot en commun avec HSK 1 (niveaux exclusifs)', () => {
    const hsk1CharIds = new Set(generatedHsk1.characters.map((c) => c.id));
    const hsk1WordIds = new Set(generatedHsk1.words.map((w) => w.id));
    expect(data.characters.some((c) => hsk1CharIds.has(c.id))).toBe(false);
    expect(data.words.some((w) => hsk1WordIds.has(w.id))).toBe(false);
  });

  it('intégrité référentielle inter-fichiers : chaque character_ref résout dans HSK1 ∪ HSK2', () => {
    const knownCharIds = new Set([
      ...generatedHsk1.characters.map((c) => c.id),
      ...data.characters.map((c) => c.id),
    ]);
    const orphans: string[] = [];
    for (const w of data.words) {
      for (const ref of w.character_refs) {
        if (!knownCharIds.has(ref)) orphans.push(`${w.id} → ${ref}`);
      }
    }
    expect(orphans).toEqual([]);
  });

  it('tous les IDs de caractères et de mots sont uniques', () => {
    const charIds = data.characters.map((c) => c.id);
    const wordIds = data.words.map((w) => w.id);
    expect(new Set(charIds).size).toBe(charIds.length);
    expect(new Set(wordIds).size).toBe(wordIds.length);
  });
});
