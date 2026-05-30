import { describe, expect, it } from 'vitest';
import { countDue, isDue, pickNextDue } from './dueQueue';
import type { ProgressEntry } from '../../domain/ports/ProgressRepository';

function entry(refId: `char_${string}`, due: string, successes = 0): ProgressEntry {
  return {
    ref: { type: 'character', id: refId },
    srs_state: { interval_days: 1, ease: 2.5, due },
    stats: { attempts: 1, successes, last_seen: due },
  };
}

const TODAY = new Date('2026-06-15T00:00:00Z');

describe('isDue', () => {
  it('true si due ≤ today', () => {
    expect(isDue(entry('char_A001', '2026-06-15'), TODAY)).toBe(true);
    expect(isDue(entry('char_A002', '2026-06-14'), TODAY)).toBe(true);
    expect(isDue(entry('char_A003', '2024-01-01'), TODAY)).toBe(true);
  });

  it('false si due > today', () => {
    expect(isDue(entry('char_A004', '2026-06-16'), TODAY)).toBe(false);
    expect(isDue(entry('char_A005', '2027-01-01'), TODAY)).toBe(false);
  });
});

describe('countDue', () => {
  it("compte les items dus aujourd'hui ou avant", () => {
    const items = [
      entry('char_A001', '2026-06-10'),
      entry('char_A002', '2026-06-15'),
      entry('char_A003', '2026-06-16'),
      entry('char_A004', '2026-06-20'),
    ];
    expect(countDue(items, TODAY)).toBe(2);
  });

  it('retourne 0 pour une liste vide', () => {
    expect(countDue([], TODAY)).toBe(0);
  });
});

describe('pickNextDue', () => {
  it("retourne null si aucun item n'est dû", () => {
    expect(pickNextDue([entry('char_A001', '2027-01-01')], TODAY)).toBeNull();
  });

  it("priorise l'item avec la date due la plus ancienne", () => {
    const oldest = entry('char_A002', '2026-05-01');
    const items = [entry('char_A001', '2026-06-10'), oldest, entry('char_A003', '2026-06-14')];
    expect(pickNextDue(items, TODAY)?.ref.id).toBe('char_A002');
  });

  it("à égalité de date, priorise l'item avec moins de successes", () => {
    const items = [entry('char_A001', '2026-06-10', 5), entry('char_A002', '2026-06-10', 1)];
    expect(pickNextDue(items, TODAY)?.ref.id).toBe('char_A002');
  });

  it('ne retourne jamais un item non dû même si stats sont basses', () => {
    const items = [entry('char_A001', '2027-01-01', 0), entry('char_A002', '2026-06-15', 10)];
    expect(pickNextDue(items, TODAY)?.ref.id).toBe('char_A002');
  });
});
