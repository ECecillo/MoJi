import type { Character, Word } from '../domain/schema/types';

/**
 * Filtres appliqués au glossaire. Tous les champs sont optionnels — un
 * filtre absent signifie "ne pas appliquer cet axe".
 *
 * - `tags` : un item passe si au moins UN de ses tags figure dans le set.
 *   Si le set est vide ou indéfini, le filtre est inactif.
 * - `strokeCount` / `frequencyRank` : intervalle inclusif [min, max].
 *   Si une borne est null/undefined, elle est ignorée.
 *
 * Les filtres `strokeCount` et `frequencyRank` n'ont de sens que pour les
 * caractères. Côté mots, ils sont ignorés silencieusement.
 */
export interface GlossaryFilters {
  tags?: ReadonlySet<string>;
  strokeCount?: { min?: number | null; max?: number | null };
  frequencyRank?: { min?: number | null; max?: number | null };
}

export function isFilterActive(filters: GlossaryFilters): boolean {
  if (filters.tags && filters.tags.size > 0) return true;
  if (filters.strokeCount && (isSet(filters.strokeCount.min) || isSet(filters.strokeCount.max))) {
    return true;
  }
  if (
    filters.frequencyRank &&
    (isSet(filters.frequencyRank.min) || isSet(filters.frequencyRank.max))
  ) {
    return true;
  }
  return false;
}

export function activeFilterCount(filters: GlossaryFilters): number {
  let count = 0;
  if (filters.tags && filters.tags.size > 0) count++;
  if (filters.strokeCount && (isSet(filters.strokeCount.min) || isSet(filters.strokeCount.max))) {
    count++;
  }
  if (
    filters.frequencyRank &&
    (isSet(filters.frequencyRank.min) || isSet(filters.frequencyRank.max))
  ) {
    count++;
  }
  return count;
}

export function matchesFilters(item: Character | Word, filters: GlossaryFilters): boolean {
  if (!matchesTags(item, filters.tags)) return false;
  if ('stroke_count' in item) {
    if (!matchesRange(item.stroke_count, filters.strokeCount)) return false;
    if (filters.frequencyRank) {
      // Si on demande une plage de fréquence et que l'item n'a pas de
      // frequency_rank, on l'exclut (sinon on laisse passer des "trous").
      if (item.frequency_rank === undefined) return false;
      if (!matchesRange(item.frequency_rank, filters.frequencyRank)) return false;
    }
  }
  return true;
}

function matchesTags(item: Character | Word, selected: ReadonlySet<string> | undefined): boolean {
  if (!selected || selected.size === 0) return true;
  return item.tags.some((tag) => selected.has(tag));
}

function matchesRange(
  value: number,
  range: { min?: number | null; max?: number | null } | undefined,
): boolean {
  if (!range) return true;
  if (isSet(range.min) && value < range.min) return false;
  if (isSet(range.max) && value > range.max) return false;
  return true;
}

function isSet(n: number | null | undefined): n is number {
  return n !== null && n !== undefined && !Number.isNaN(n);
}

export function uniqueTagsOf(items: ReadonlyArray<Character | Word>): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags) seen.add(tag);
  }
  return [...seen].sort();
}
