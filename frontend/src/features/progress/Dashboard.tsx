import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProgress } from './useProgress';
import { getLearningStatus, type LearningStatus } from '../../lib/glossaryFilters';
import { readApiToken, writeApiToken } from '../../lib/syncToken';
import type { Character, Word } from '../../domain/schema/types';

interface DashboardProps {
  characters: Character[];
  words: Word[];
  onBack: () => void;
  onSelect: (hanzi: string) => void;
}

export function Dashboard({ characters, words: _words, onBack, onSelect }: DashboardProps) {
  const { t } = useTranslation();
  const { entries, loading, sync, syncing, syncError } = useProgress();

  const stats = useMemo(() => {
    const today = new Date();
    const counts: Record<LearningStatus, number> = {
      new: 0,
      learning: 0,
      due: 0,
      mastered: 0,
    };

    const progressMap = new Map(entries.map((e) => [e.ref.id, e]));

    // On ne compte que les caractères pour le dashboard (unité SRS actuelle)
    for (const char of characters) {
      const p = progressMap.get(char.id);
      const status = getLearningStatus(char, p, today);
      counts[status]++;
    }

    return { counts, total: characters.length };
  }, [entries, characters]);

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-ink-muted">...</div>;
  }

  const { counts, total } = stats;

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto px-4 py-2 scrollbar-hide">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="border border-ink px-2 py-1 text-xs font-bold">
          ← {t('glossary.detail.back')}
        </button>
        <h2 className="text-lg font-semibold text-ink">{t('dashboard.title')}</h2>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t('glossary.filters.status_new')}
          count={counts.new}
          total={total}
          color="bg-ink-muted"
        />
        <StatCard
          label={t('glossary.filters.status_learning')}
          count={counts.learning}
          total={total}
          color="bg-blue-500"
        />
        <StatCard
          label={t('glossary.filters.status_due')}
          count={counts.due}
          total={total}
          color="bg-orange-500"
        />
        <StatCard
          label={t('glossary.filters.status_mastered')}
          count={counts.mastered}
          total={total}
          color="bg-green-500"
        />
      </section>

      <section className="flex flex-col gap-2 mt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
          {t('dashboard.recent_activity')}
        </h3>
        {entries.length === 0 ? (
          <p className="text-sm italic text-ink-faint py-4">{t('dashboard.no_activity')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...entries]
              .sort((a, b) => b.stats.last_seen.localeCompare(a.stats.last_seen))
              .slice(0, 5)
              .map((e) => {
                const char = characters.find((c) => c.id === e.ref.id);
                if (!char) return null;
                return (
                  <button
                    key={e.ref.id}
                    onClick={() => onSelect(char.hanzi)}
                    className="flex items-center justify-between border border-ink p-3 hover:bg-ink hover:text-paper group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-hanzi text-2xl">{char.hanzi}</span>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-medium group-hover:text-paper-muted">
                          {e.stats.successes} / {e.stats.attempts} {t('dashboard.success_rate')}
                        </span>
                        <span className="text-[10px] text-ink-faint group-hover:text-paper-faint">
                          {t('dashboard.last_seen_on')} {e.stats.last_seen}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold">→</span>
                  </button>
                );
              })}
          </div>
        )}
      </section>

      <SyncSettings sync={sync} syncing={syncing} syncError={syncError} />
    </div>
  );
}

function SyncSettings({
  sync,
  syncing,
  syncError,
}: {
  sync: () => Promise<void>;
  syncing: boolean;
  syncError: string | null;
}) {
  const { t } = useTranslation();
  const [token, setToken] = useState(readApiToken);
  const [saved, setSaved] = useState(false);

  const save = () => {
    writeApiToken(token);
    setSaved(true);
    void sync();
  };

  const status = syncing
    ? t('sync.syncing')
    : syncError
      ? t('dashboard.sync_error')
      : saved
        ? t('dashboard.sync_saved')
        : '';

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
        {t('dashboard.sync_title')}
      </h3>
      <p className="text-xs text-ink-faint">{t('dashboard.sync_hint')}</p>
      <div className="flex gap-2">
        <input
          type="password"
          value={token}
          autoComplete="off"
          onChange={(e) => {
            setToken(e.target.value);
            setSaved(false);
          }}
          placeholder={t('dashboard.sync_token_placeholder')}
          className="flex-1 border border-ink bg-paper px-2 py-1 text-sm"
          data-testid="sync-token-input"
        />
        <button
          type="button"
          onClick={save}
          className="border border-ink px-3 py-1 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-paper"
          data-testid="sync-token-save"
        >
          {t('dashboard.sync_save')}
        </button>
      </div>
      {status ? (
        <p className="text-xs text-ink-muted" aria-live="polite" data-testid="sync-status">
          {status}
        </p>
      ) : null}
    </section>
  );
}

function StatCard({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percent = Math.round((count / total) * 100);
  return (
    <div className="flex flex-col border border-ink p-3 gap-1">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
      </div>
      <span className="text-2xl font-bold text-ink">{count}</span>
      <span className="text-[10px] text-ink-faint">{percent}%</span>
    </div>
  );
}
