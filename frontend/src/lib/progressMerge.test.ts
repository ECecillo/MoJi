import { describe, expect, it } from 'vitest';
import type { ProgressEntry } from '../domain/ports/ProgressRepository';
import { mergeEntry, mergeProgress } from './progressMerge';

function entry(
  id: `char_${string}`,
  attempts: number,
  lastSeen: string,
  intervalDays = attempts,
): ProgressEntry {
  return {
    ref: { type: 'character', id },
    srs_state: { interval_days: intervalDays, ease: 2.5, due: '2026-06-10' },
    stats: { attempts, successes: attempts, last_seen: lastSeen },
  };
}

describe('mergeEntry', () => {
  it('garde le record avec le plus d’attempts', () => {
    const a = entry('char_1', 5, '2026-06-01', 40);
    const b = entry('char_1', 3, '2026-06-09', 10);
    expect(mergeEntry(a, b)).toEqual(a);
    expect(mergeEntry(b, a)).toEqual(a); // indépendant de l'ordre
  });

  it('à attempts égaux, garde le last_seen le plus récent', () => {
    const a = entry('char_1', 4, '2026-06-01', 40);
    const b = entry('char_1', 4, '2026-06-09', 10);
    expect(mergeEntry(a, b)).toEqual(b);
    expect(mergeEntry(b, a)).toEqual(b);
  });

  it('adopte le record entier (pas de mélange de champs)', () => {
    const a = entry('char_1', 6, '2026-06-01', 99);
    const b = entry('char_1', 2, '2026-06-30', 1);
    const winner = mergeEntry(a, b);
    expect(winner.srs_state.interval_days).toBe(99);
    expect(winner.stats.last_seen).toBe('2026-06-01');
  });
});

describe('mergeProgress', () => {
  it('fusionne les refs communes et conserve les refs disjointes', () => {
    const local: ProgressEntry[] = [
      entry('char_1', 5, '2026-06-01'),
      entry('char_2', 1, '2026-06-02'),
    ];
    const remote: ProgressEntry[] = [
      entry('char_1', 3, '2026-06-09'),
      entry('char_3', 2, '2026-06-03'),
    ];

    const merged = mergeProgress(local, remote);
    const byId = new Map(merged.map((e) => [e.ref.id, e]));

    expect(merged).toHaveLength(3);
    expect(byId.get('char_1')?.stats.attempts).toBe(5); // local plus avancé gagne
    expect(byId.get('char_2')).toBeDefined(); // local seul conservé
    expect(byId.get('char_3')).toBeDefined(); // remote seul conservé
  });

  it('est indépendant de l’ordre des arguments (refs distinctes)', () => {
    const local: ProgressEntry[] = [entry('char_1', 5, '2026-06-01')];
    const remote: ProgressEntry[] = [entry('char_1', 8, '2026-06-09')];
    expect(mergeProgress(local, remote)).toEqual(mergeProgress(remote, local));
  });
});
