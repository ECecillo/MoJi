import { describe, expect, it } from 'vitest';
import { qualityFromSession } from './quality';

describe('qualityFromSession', () => {
  it('session non complétée → quality 0 quelle que soit le nombre de refus', () => {
    expect(qualityFromSession({ refusals: 0, completed: false })).toBe(0);
    expect(qualityFromSession({ refusals: 5, completed: false })).toBe(0);
  });

  it('zéro refus → 5 (parfait)', () => {
    expect(qualityFromSession({ refusals: 0, completed: true })).toBe(5);
  });

  it('1 refus → 4', () => {
    expect(qualityFromSession({ refusals: 1, completed: true })).toBe(4);
  });

  it('2 refus → 3 (limite succès / échec)', () => {
    expect(qualityFromSession({ refusals: 2, completed: true })).toBe(3);
  });

  it('3-4 refus → 2 (bascule en échec SM-2)', () => {
    expect(qualityFromSession({ refusals: 3, completed: true })).toBe(2);
    expect(qualityFromSession({ refusals: 4, completed: true })).toBe(2);
  });

  it('5+ refus → 1', () => {
    expect(qualityFromSession({ refusals: 5, completed: true })).toBe(1);
    expect(qualityFromSession({ refusals: 50, completed: true })).toBe(1);
  });
});
