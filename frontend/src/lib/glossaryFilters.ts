import type { Character, Word } from '../domain/schema/types';
import type { ProgressEntry } from '../domain/ports/ProgressRepository';
import { isDue } from './srs/dueQueue';

/**
 * Statuts d'apprentissage possibles pour un item du glossaire.
 *
 * - `new` : jamais vu (pas d'entrée dans ProgressRepository).
 * - `learning` : déjà vu mais pas encore maîtrisé ni dû aujourd'hui.
 * - `due` : à réviser aujourd'hui ou en retard.
 * - `mastered` : maîtrisé (intervalle ≥ 30 jours).
 */
export type LearningStatus = 'new' | 'learning' | 'due' | 'mastered';

/**
 * Filtres appliqués au glossaire. Tous les champs sont optionnels — un
 * filtre absent signifie "ne pas appliquer cet axe".
 *
 * - `tags` : un item passe si au moins UN de ses tags figure dans le set.
 * - `strokeCount` / `frequencyRank` : intervalle inclusif [min, max].
 * - `status` : un item passe si son statut actuel est dans le set.
 */
export interface GlossaryFilters {
  tags?: ReadonlySet<string>;
  strokeCount?: { min?: number | null; max?: number | null };
  frequencyRank?: { min?: number | null; max?: number | null };
  status?: ReadonlySet<LearningStatus>;
  hskLevels?: ReadonlySet<number>;
}

export function isFilterActive(filters: GlossaryFilters): boolean {
  if (filters.tags && filters.tags.size > 0) return true;
  if (filters.status && filters.status.size > 0) return true;
  if (filters.hskLevels && filters.hskLevels.size > 0) return true;
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
  if (filters.status && filters.status.size > 0) count++;
  if (filters.hskLevels && filters.hskLevels.size > 0) count++;
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

export function getLearningStatus(
  _item: Character | Word,
  progress: ProgressEntry | undefined,
  today: Date,
): LearningStatus {
  if (!progress) return 'new';
  if (isDue(progress, today)) return 'due';
  if (progress.srs_state.interval_days >= 30) return 'mastered';
  return 'learning';
}

export function matchesFilters(
  item: Character | Word,
  filters: GlossaryFilters,
  progress?: ProgressEntry,
  today?: Date,
): boolean {
  if (!matchesTags(item, filters.tags)) return false;

  if (filters.hskLevels && filters.hskLevels.size > 0 && !filters.hskLevels.has(item.hsk_level)) {
    return false;
  }

  if (filters.status && filters.status.size > 0 && today) {
    const status = getLearningStatus(item, progress, today);
    if (!filters.status.has(status)) return false;
  }

  if ('stroke_count' in item) {
    if (!matchesRange(item.stroke_count, filters.strokeCount)) return false;
    if (filters.frequencyRank) {
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
