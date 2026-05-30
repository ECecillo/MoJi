import { useCallback, useEffect, useMemo, useState } from 'react';
import { LocalStorageProgressRepository } from '../../adapters/storage/LocalStorageProgressRepository';
import { applyReview } from '../../lib/srs/sm2';
import type { ReviewSessionResult } from '../../lib/srs/quality';
import { qualityFromSession } from '../../lib/srs/quality';
import type {
  ProgressEntry,
  ProgressRepository,
  ProgressTargetRef,
} from '../../domain/ports/ProgressRepository';

/**
 * Hook React qui orchestre la lecture/écriture du `ProgressRepository` et
 * applique SM-2 sur les sessions terminées.
 *
 * - `entries` : liste réactive de toutes les entrées de progression.
 * - `recordSession(ref, session, today)` : applique SM-2, persiste, met à
 *   jour `entries`. Renvoie l'entrée mise à jour.
 *
 * Le repository peut être injecté pour les tests. Par défaut : localStorage.
 */
export function useProgress(repository?: ProgressRepository): {
  entries: ProgressEntry[];
  recordSession: (
    ref: ProgressTargetRef,
    session: ReviewSessionResult,
    today?: Date,
  ) => Promise<ProgressEntry>;
  loading: boolean;
} {
  const repo = useMemo<ProgressRepository>(
    () => repository ?? new LocalStorageProgressRepository(),
    [repository],
  );

  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    repo
      .list()
      .then((list) => {
        if (cancelled) return;
        setEntries(list);
      })
      .catch((err: unknown) => {
        console.error('Failed to load progress:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const recordSession = useCallback(
    async (
      ref: ProgressTargetRef,
      session: ReviewSessionResult,
      today: Date = new Date(),
    ): Promise<ProgressEntry> => {
      const existing = await repo.get(ref);
      const previousState = existing?.srs_state ?? null;
      const quality = qualityFromSession(session);
      const newSrsState = applyReview(previousState, quality, today);

      const previousStats = existing?.stats ?? { attempts: 0, successes: 0, last_seen: '' };
      const success = quality >= 3;
      const todayIso = today.toISOString().slice(0, 10);

      const updated: ProgressEntry = {
        ref,
        srs_state: newSrsState,
        stats: {
          attempts: previousStats.attempts + 1,
          successes: previousStats.successes + (success ? 1 : 0),
          last_seen: todayIso,
        },
      };

      await repo.upsert(updated);
      const next = await repo.list();
      setEntries(next);
      return updated;
    },
    [repo],
  );

  return { entries, recordSession, loading };
}
