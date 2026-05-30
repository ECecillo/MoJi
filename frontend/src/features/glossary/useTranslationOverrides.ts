import { useCallback, useEffect, useMemo, useState } from 'react';
import { LocalStorageTranslationOverrideRepository } from '../../adapters/storage/LocalStorageTranslationOverrideRepository';
import type {
  EntryId,
  LanguageCode,
  OverrideMap,
  TranslationOverrideRepository,
} from '../../domain/ports/TranslationOverrideRepository';

/**
 * Hook React qui expose l'état des surcharges de traductions et leur édition.
 *
 * - Chargement initial au montage (Promise).
 * - L'état est gardé en mémoire (`overrides`) ; chaque appel à `setOverride`
 *   met à jour à la fois le stockage persistant et l'état React (pour la
 *   réactivité sans re-fetch).
 * - L'`overrides` exposé est une `OverrideMap` directement consommable par
 *   `mergeTranslations`.
 *
 * Le repository peut être injecté (pour les tests). Par défaut il pointe sur
 * `localStorage` côté navigateur. Une instance unique est partagée tant que
 * le repo passé en props ne change pas.
 */
export function useTranslationOverrides(repository?: TranslationOverrideRepository): {
  overrides: OverrideMap;
  setOverride: (entryId: EntryId, lang: LanguageCode, items: string[]) => Promise<void>;
  loading: boolean;
} {
  const repo = useMemo<TranslationOverrideRepository>(
    () => repository ?? new LocalStorageTranslationOverrideRepository(),
    [repository],
  );

  const [overrides, setOverrides] = useState<OverrideMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    repo
      .loadAll()
      .then((map) => {
        if (cancelled) return;
        setOverrides(map);
      })
      .catch((err: unknown) => {
        console.error('Failed to load translation overrides:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const setOverride = useCallback(
    async (entryId: EntryId, lang: LanguageCode, items: string[]) => {
      await repo.setForLanguage(entryId, lang, items);
      const next = await repo.loadAll();
      setOverrides(next);
    },
    [repo],
  );

  return { overrides, setOverride, loading };
}
