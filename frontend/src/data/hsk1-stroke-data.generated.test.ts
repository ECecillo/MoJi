/**
 * Tests d'intégrité sur `hsk1-stroke-data.generated.json` — le sous-ensemble de
 * données de tracé Hanzi Writer produit par `scripts/build-hsk1-data.ts`.
 *
 * Garantissent que chaque caractère HSK 1 a exactement ses données de tracé
 * (ni manquant, ni surnuméraire) et que celles-ci sont bien formées. C'est le
 * filet qui détecterait une régression du pipeline d'optimisation des assets.
 */

import characters from './hsk1.generated.json';
import strokeData from './hsk1-stroke-data.generated.json';

interface StrokeData {
  strokes: string[];
  medians: number[][][];
}

const map = strokeData as Record<string, StrokeData>;

describe('hsk1-stroke-data.generated.json', () => {
  it('couvre exactement les 300 caractères HSK 1, sans entrée surnuméraire', () => {
    const hanziSet = new Set(characters.characters.map((c) => c.hanzi));
    const mapKeys = new Set(Object.keys(map));

    const missing = [...hanziSet].filter((h) => !mapKeys.has(h));
    const extra = [...mapKeys].filter((h) => !hanziSet.has(h));

    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
    expect(mapKeys.size).toBe(300);
  });

  it('chaque entrée a des traits non vides et autant de médianes que de traits', () => {
    const offenders: string[] = [];
    for (const [hanzi, data] of Object.entries(map)) {
      if (
        !Array.isArray(data.strokes) ||
        !Array.isArray(data.medians) ||
        data.strokes.length === 0 ||
        data.strokes.length !== data.medians.length
      ) {
        offenders.push(hanzi);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('spot-check : 你 a 7 traits', () => {
    expect(map['你']?.strokes).toHaveLength(7);
  });
});
