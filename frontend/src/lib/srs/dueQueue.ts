import type { ProgressEntry } from '../../domain/ports/ProgressRepository';

/**
 * Helpers purs pour interroger la file de révision à partir d'une liste
 * d'entrées de progression.
 *
 * Un item est "dû" quand sa date `due` est ≤ today (jours pleins, format
 * YYYY-MM-DD). La date est comparée lexicographiquement — c'est exact pour
 * ce format ISO.
 */

function isoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDue(entry: ProgressEntry, today: Date): boolean {
  return entry.srs_state.due <= isoDate(today);
}

export function countDue(entries: ReadonlyArray<ProgressEntry>, today: Date): number {
  return entries.reduce((count, e) => (isDue(e, today) ? count + 1 : count), 0);
}

/**
 * Sélectionne le prochain item à réviser. Ordre :
 *   1. Items dont la date `due` est la plus ancienne (en retard de
 *      plusieurs jours en premier).
 *   2. À égalité, items avec moins de succès passés (stats.successes plus bas).
 *   3. À égalité, ordre stable d'insertion (ref).
 *
 * Retourne null si aucun item n'est dû.
 */
export function pickNextDue(
  entries: ReadonlyArray<ProgressEntry>,
  today: Date,
): ProgressEntry | null {
  const dueEntries = entries.filter((e) => isDue(e, today));
  if (dueEntries.length === 0) return null;

  const sorted = [...dueEntries].sort((a, b) => {
    if (a.srs_state.due !== b.srs_state.due) {
      return a.srs_state.due < b.srs_state.due ? -1 : 1;
    }
    if (a.stats.successes !== b.stats.successes) {
      return a.stats.successes - b.stats.successes;
    }
    return 0;
  });
  return sorted[0] ?? null;
}
