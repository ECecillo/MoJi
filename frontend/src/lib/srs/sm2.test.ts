import { describe, expect, it } from 'vitest';
import { applyReview } from './sm2';

const DAY_0 = new Date('2026-06-01T00:00:00Z');

function nDaysAfter(base: Date, n: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('applyReview — premier rappel (state=null)', () => {
  it('quality 5 → interval=1, ease ≈ 2.6, due=demain', () => {
    const next = applyReview(null, 5, DAY_0);
    expect(next.interval_days).toBe(1);
    expect(next.ease).toBeCloseTo(2.6, 5);
    expect(next.due).toBe(nDaysAfter(DAY_0, 1));
  });

  it('quality 3 → interval=1, ease ≈ 2.36, due=demain', () => {
    // q=3 : delta = 0.1 - 2*(0.08 + 2*0.02) = 0.1 - 0.24 = -0.14 → 2.36
    const next = applyReview(null, 3, DAY_0);
    expect(next.interval_days).toBe(1);
    expect(next.ease).toBeCloseTo(2.36, 5);
  });

  it("quality 0 → interval=0, ease minoré, due=aujourd'hui", () => {
    const next = applyReview(null, 0, DAY_0);
    expect(next.interval_days).toBe(0);
    // q=0 : delta = 0.1 - 5*(0.08 + 5*0.02) = 0.1 - 0.9 = -0.8 → 1.7
    expect(next.ease).toBeCloseTo(1.7, 5);
    expect(next.due).toBe(nDaysAfter(DAY_0, 0));
  });
});

describe('applyReview — rappels suivants', () => {
  it('deuxième succès passe interval à 6 jours (convention SM-2)', () => {
    const first = applyReview(null, 5, DAY_0); // interval=1
    const second = applyReview(first, 5, new Date('2026-06-02T00:00:00Z'));
    expect(second.interval_days).toBe(6);
  });

  it("troisième succès consécutif amplifie l'intervalle au-delà de 15 jours", () => {
    const first = applyReview(null, 5, DAY_0); // interval=1
    const second = applyReview(first, 5, new Date('2026-06-02T00:00:00Z')); // interval=6
    const third = applyReview(second, 5, new Date('2026-06-08T00:00:00Z'));
    // SM-2 : 3ᵉ succès → interval ≈ 6 * ease, soit ~16-17 jours
    expect(third.interval_days).toBeGreaterThanOrEqual(16);
    expect(third.interval_days).toBeLessThanOrEqual(20);
    expect(third.interval_days).toBeGreaterThan(second.interval_days);
  });

  it('échec à un rappel établi remet interval à 0 et diminue ease', () => {
    const established = applyReview(null, 5, DAY_0); // interval=1, ease≈2.6
    const failed = applyReview(established, 0, new Date('2026-06-02T00:00:00Z'));
    expect(failed.interval_days).toBe(0);
    expect(failed.ease).toBeLessThan(established.ease);
    expect(failed.due).toBe('2026-06-02');
  });

  it('ease ne descend jamais sous 1.3', () => {
    let state = applyReview(null, 0, DAY_0);
    for (let i = 0; i < 20; i++) {
      state = applyReview(state, 0, DAY_0);
    }
    expect(state.ease).toBe(1.3);
  });
});

describe('applyReview — propriétés générales', () => {
  it('la sortie est toujours déterministe pour un (state, quality, today)', () => {
    const a = applyReview(null, 4, DAY_0);
    const b = applyReview(null, 4, DAY_0);
    expect(a).toEqual(b);
  });

  it('today est respecté pour calculer due', () => {
    const today = new Date('2030-01-15T00:00:00Z');
    const next = applyReview(null, 5, today);
    expect(next.due).toBe('2030-01-16');
  });
});
