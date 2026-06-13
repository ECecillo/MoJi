import type { ProgressEntry, ProgressTargetRef } from '../domain/ports/ProgressRepository';

/**
 * Merge par champ de la progression entre deux sources (local ↔ distant),
 * cf. RFC 0011. Règle symétrique avec le merge serveur (SQLite), donc l'ordre
 * de synchronisation n'a pas d'importance.
 */

function sameRef(a: ProgressTargetRef, b: ProgressTargetRef): boolean {
  return a.type === b.type && a.id === b.id;
}

/**
 * Choisit le record « le plus avancé » entre deux entrées de même ref :
 *  - plus d'`attempts` gagne ;
 *  - à `attempts` égaux, le `last_seen` le plus récent gagne ;
 *  - le record entier est adopté (pas de mélange de champs), pour garder un
 *    état SRS cohérent.
 */
export function mergeEntry(a: ProgressEntry, b: ProgressEntry): ProgressEntry {
  if (b.stats.attempts > a.stats.attempts) return b;
  if (b.stats.attempts < a.stats.attempts) return a;
  // attempts égaux : départage par last_seen (dates ISO comparables en l'état).
  return b.stats.last_seen > a.stats.last_seen ? b : a;
}

/**
 * Fusionne deux listes de progression : pour chaque ref présente des deux
 * côtés on applique `mergeEntry`, les refs présentes d'un seul côté sont
 * conservées telles quelles.
 */
export function mergeProgress(first: ProgressEntry[], second: ProgressEntry[]): ProgressEntry[] {
  const result: ProgressEntry[] = first.map((e) => e);

  for (const incoming of second) {
    const idx = result.findIndex((e) => sameRef(e.ref, incoming.ref));
    if (idx >= 0) {
      const current = result[idx];
      if (current !== undefined) {
        result[idx] = mergeEntry(current, incoming);
      }
    } else {
      result.push(incoming);
    }
  }

  return result;
}
