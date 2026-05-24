/**
 * Port `ProgressRepository` — persistance locale de la progression utilisateur.
 *
 * L'implémentation initiale (Lot 3) ciblera IndexedDB, mais le domaine ne
 * connaît jamais les détails de stockage. Une implémentation in-memory peut
 * être utilisée dans les tests.
 */

export type ProgressTargetRef =
  | { type: 'character'; id: `char_${string}` }
  | { type: 'word'; id: `word_${string}` };

export interface SrsState {
  interval_days: number;
  ease: number;
  /** Date au format ISO 8601 (date sans heure suffit). */
  due: string;
}

export interface ProgressStats {
  attempts: number;
  successes: number;
  /** Date ISO 8601. */
  last_seen: string;
}

export interface ProgressEntry {
  ref: ProgressTargetRef;
  srs_state: SrsState;
  stats: ProgressStats;
}

export interface ProgressRepository {
  list(): Promise<ProgressEntry[]>;
  get(ref: ProgressTargetRef): Promise<ProgressEntry | null>;
  upsert(entry: ProgressEntry): Promise<void>;
  remove(ref: ProgressTargetRef): Promise<void>;
}
