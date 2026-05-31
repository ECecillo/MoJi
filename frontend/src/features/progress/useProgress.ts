import { useCallback, useEffect, useMemo, useState } from 'react';
import { LocalStorageProgressRepository } from '../../adapters/storage/LocalStorageProgressRepository';
import { RestSyncClient } from '../../adapters/api/RestSyncClient';
import { applyReview } from '../../lib/srs/sm2';
import type { ReviewSessionResult } from '../../lib/srs/quality';
import { qualityFromSession } from '../../lib/srs/quality';
import type {
  ProgressEntry,
  ProgressRepository,
  ProgressTargetRef,
} from '../../domain/ports/ProgressRepository';
import type { SyncClient } from '../../domain/ports/SyncClient';

/**
 * Hook React qui orchestre la lecture/écriture du `ProgressRepository`,
 * applique SM-2 sur les sessions terminées, et gère la synchronisation.
 *
 * - `entries` : liste réactive de toutes les entrées de progression.
 * - `recordSession(ref, session, today)` : applique SM-2, persiste, push, met à
 *   jour `entries`.
 * - `sync()` : pull depuis le serveur et merge en local (last one wins).
 */
export function useProgress(
  repository?: ProgressRepository,
  syncClient?: SyncClient,
): {
  entries: ProgressEntry[];
  recordSession: (
    ref: ProgressTargetRef,
    session: ReviewSessionResult,
    today?: Date,
  ) => Promise<ProgressEntry>;
  sync: () => Promise<void>;
  loading: boolean;
  syncing: boolean;
} {
  const repo = useMemo<ProgressRepository>(
    () => repository ?? new LocalStorageProgressRepository(),
    [repository],
  );

  const client = useMemo<SyncClient>(() => syncClient ?? new RestSyncClient(), [syncClient]);

  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      // Stratégie Batch Upsert Simple :
      // 1. Pull du serveur
      const remote = await client.pull();

      if (remote.length > 0) {
        // 2. Upsert dans le repo local
        await repo.upsertBatch(remote);
      }

      // 3. Push de l'état local complet (merge client-side pour cette version)
      const local = await repo.list();
      await client.push(local);

      setEntries(local);
    } catch (err: unknown) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }, [repo, client]);

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
        if (!cancelled) {
          setLoading(false);
          // Auto-sync au chargement initial
          void sync();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repo, sync]);

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

      // Déclencher sync en background après une session
      void sync();

      return updated;
    },
    [repo, sync],
  );

  return { entries, recordSession, sync, loading, syncing };
}
