import type { ProgressEntry } from '../../domain/ports/ProgressRepository';

/**
 * Port pour la synchronisation de la progression avec un serveur distant.
 */
export interface SyncClient {
  /**
   * Récupère toute la progression depuis le serveur.
   */
  pull(): Promise<ProgressEntry[]>;

  /**
   * Envoie toute la progression locale au serveur (Batch Upsert).
   */
  push(entries: ProgressEntry[]): Promise<void>;
}
