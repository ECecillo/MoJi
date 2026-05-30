import { describe, it, expect } from 'vitest';
import {
  endpointToleranceFromCanvasSize,
  strokesAreSimilar,
  type Point2D,
} from './strokeSimilarity';

function makeStroke(...points: Array<[number, number]>): Point2D[] {
  return points.map(([x, y]) => ({ x, y }));
}

describe('strokesAreSimilar', () => {
  it('retourne true quand deux traits ont des endpoints proches', () => {
    const a = makeStroke([10, 10], [50, 50], [100, 100]);
    const b = makeStroke([12, 9], [55, 51], [98, 103]);

    expect(strokesAreSimilar(a, b, { endpointToleranceInPx: 10 })).toBe(true);
  });

  it('retourne false quand les points de début sont éloignés', () => {
    const a = makeStroke([10, 10], [100, 100]);
    const b = makeStroke([200, 10], [100, 100]);

    expect(strokesAreSimilar(a, b, { endpointToleranceInPx: 10 })).toBe(false);
  });

  it('retourne false quand les points de fin sont éloignés', () => {
    const a = makeStroke([10, 10], [100, 100]);
    const b = makeStroke([10, 10], [200, 200]);

    expect(strokesAreSimilar(a, b, { endpointToleranceInPx: 10 })).toBe(false);
  });

  it('retourne false quand un des deux traits est vide', () => {
    const a = makeStroke([10, 10], [100, 100]);
    const b: Point2D[] = [];

    expect(strokesAreSimilar(a, b, { endpointToleranceInPx: 10 })).toBe(false);
    expect(strokesAreSimilar(b, a, { endpointToleranceInPx: 10 })).toBe(false);
  });

  it('ignore les variations sur les points intermédiaires', () => {
    const a = makeStroke([10, 10], [50, 50], [100, 100]);
    const b = makeStroke([12, 11], [40, 80], [70, 30], [99, 101]); // chemin différent
    // Endpoints proches mais trajectoire au milieu très différente — la
    // similarité ne s'occupe pas de la trajectoire, juste des endpoints.
    expect(strokesAreSimilar(a, b, { endpointToleranceInPx: 10 })).toBe(true);
  });

  it("un trait inversé (début/fin permutés) n'est PAS similaire", () => {
    // L'utilisateur qui trace dans le mauvais sens ne fait pas un trait
    // "déjà tracé" — c'est une erreur que Hanzi Writer signale séparément
    // (wrong_direction). On ne veut pas masquer ce feedback.
    const a = makeStroke([10, 10], [100, 100]);
    const b = makeStroke([100, 100], [10, 10]);

    expect(strokesAreSimilar(a, b, { endpointToleranceInPx: 10 })).toBe(false);
  });

  it('un point isolé (1 seul point) est traité comme un trait dégénéré', () => {
    const a = makeStroke([10, 10]);
    const b = makeStroke([10, 10]);
    // Start == End pour les deux : techniquement similaire à lui-même.
    expect(strokesAreSimilar(a, b, { endpointToleranceInPx: 10 })).toBe(true);
  });
});

describe('endpointToleranceFromCanvasSize', () => {
  it('15% de 320 ≈ 48 px par défaut', () => {
    expect(endpointToleranceFromCanvasSize(320)).toBeCloseTo(48);
  });

  it('respecte un ratio personnalisé', () => {
    expect(endpointToleranceFromCanvasSize(200, 0.1)).toBe(20);
    expect(endpointToleranceFromCanvasSize(400, 0.2)).toBe(80);
  });
});
