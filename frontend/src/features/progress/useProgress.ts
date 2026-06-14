import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocalStorageProgressRepository } from '../../adapters/storage/LocalStorageProgressRepository';
import { RestSyncClient } from '../../adapters/api/RestSyncClient';
import { mergeProgress } from '../../lib/progressMerge';
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
  syncError: string | null;
} {
  const repo = useMemo<ProgressRepository>(
    () => repository ?? new LocalStorageProgressRepository(),
    [repository],
  );

  const client = useMemo<SyncClient>(() => syncClient ?? new RestSyncClient(), [syncClient]);

  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Garde anti-concurrence : les déclencheurs (focus/online/...) peuvent appeler
  // sync() en rafale ; on évite d'empiler des cycles pull/push simultanés.
  const syncInFlight = useRef(false);

  const sync = useCallback(async () => {
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    setSyncing(true);
    try {
      // Protocole pull → merge → push (cf. RFC 0011) :
      // 1. Pull du serveur.
      const remote = await client.pull();
      // 2. Merge par champ avec le local (protège le local plus avancé d'un
      //    écrasement par des données distantes périmées).
      const local = await repo.list();
      const merged = mergeProgress(local, remote);
      // 3. Persiste le merge en local et le pousse au serveur (qui re-merge).
      await repo.upsertBatch(merged);
      await client.push(merged);
      setEntries(merged);
      setSyncError(null);
    } catch (err: unknown) {
      // Offline-first : le backend de sync est optionnel. Un échec (hors-ligne,
      // backend absent) est un cas nominal, pas une erreur — on le journalise en
      // debug pour ne pas polluer la console ni l'audit (cf. Lighthouse). On
      // expose tout de même le message (ex. 401) pour le réglage de sync.
      console.debug('Sync best-effort indisponible (hors-ligne ?) :', err);
      setSyncError(err instanceof Error ? err.message : 'sync indisponible');
    } finally {
      syncInFlight.current = false;
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

  // Re-sync quand l'app redevient active ou retrouve le réseau, pour rafraîchir
  // la progression entre appareils (cf. RFC 0011). La garde syncInFlight évite
  // les cycles concurrents si plusieurs évènements se déclenchent ensemble.
  useEffect(() => {
    const onActive = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void sync();
    };
    window.addEventListener('focus', onActive);
    window.addEventListener('online', onActive);
    document.addEventListener('visibilitychange', onActive);
    return () => {
      window.removeEventListener('focus', onActive);
      window.removeEventListener('online', onActive);
      document.removeEventListener('visibilitychange', onActive);
    };
  }, [sync]);

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

  return { entries, recordSession, sync, loading, syncing, syncError };
}
