/**
 * Tests d'intégrité sur `hsk2-stroke-data.generated.json` — le sous-ensemble de
 * tracés Hanzi Writer des caractères HSK 2 (cf. RFC 0012). Garantit que chaque
 * caractère HSK 2 a exactement ses données de tracé, bien formées.
 */

import characters from './hsk2.generated.json';
import strokeData from './hsk2-stroke-data.generated.json';

interface StrokeData {
  strokes: string[];
  medians: number[][][];
}

const map = strokeData as Record<string, StrokeData>;

describe('hsk2-stroke-data.generated.json', () => {
  it('couvre exactement les 298 caractères HSK 2, sans entrée surnuméraire', () => {
    const hanziSet = new Set(characters.characters.map((c) => c.hanzi));
    const mapKeys = new Set(Object.keys(map));

    const missing = [...hanziSet].filter((h) => !mapKeys.has(h));
    const extra = [...mapKeys].filter((h) => !hanziSet.has(h));

    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
    expect(mapKeys.size).toBe(298);
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
});
