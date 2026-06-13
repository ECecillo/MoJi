import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadBundledDataSource } from '../../adapters/data/bundledReferenceData';
import { pinyinToAscii, pinyinToString } from '../../lib/pinyin';
import { mergeTranslations } from '../../lib/translations';
import { useTranslationOverrides } from './useTranslationOverrides';
import { useProgress } from '../progress/useProgress';
import { SpeakButton } from '../../ui/SpeakButton';
import {
  activeFilterCount,
  matchesFilters,
  uniqueTagsOf,
  getLearningStatus,
  type GlossaryFilters,
  type LearningStatus,
} from '../../lib/glossaryFilters';
import type { Character, Word } from '../../domain/schema/types';
import type { EntryId } from '../../domain/ports/TranslationOverrideRepository';
import type { ProgressEntry } from '../../domain/ports/ProgressRepository';

type EntryType = 'character' | 'word';

interface GlossaryProps {
  onSelect: (hanzi: string) => void;
  onShowDetail: (entryId: string) => void;
}

export function Glossary({ onSelect, onShowDetail }: GlossaryProps) {
  const { t, i18n } = useTranslation();
  const [type, setType] = useState<EntryType>('character');
  const [search, setSearch] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const { overrides } = useTranslationOverrides();
  const { entries: progressEntries, loading: loadingProgress } = useProgress();

  const [filters, setFilters] = useState<GlossaryFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const dataSource = await loadBundledDataSource();
        const [chars, wrds] = await Promise.all([dataSource.characters(), dataSource.words()]);
        if (cancelled) return;
        setCharacters(chars);
        setWords(wrds);
      } catch (error) {
        console.error('Failed to load glossary data:', error);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentLang = i18n.resolvedLanguage || 'fr';

  const allItems = type === 'character' ? characters : words;
  const availableTags = useMemo(() => uniqueTagsOf(allItems), [allItems]);

  const progressByRef = useMemo(() => {
    const map = new Map<string, ProgressEntry>();
    for (const entry of progressEntries) {
      map.set(entry.ref.id, entry);
    }
    return map;
  }, [progressEntries]);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase().trim();
    const today = new Date();

    return allItems.filter((item) => {
      const progress = progressByRef.get(item.id);
      if (!matchesFilters(item, filters, progress, today)) return false;
      if (!query) return true;

      const hanziMatch = item.hanzi.includes(query);
      const pinyinAscii = pinyinToAscii(item.pinyin).toLowerCase();
      const pinyinWithTones = pinyinToString(item.pinyin).toLowerCase();
      const pinyinMatch = pinyinAscii.includes(query) || pinyinWithTones.includes(query);

      const merged = mergeTranslations(item.translations, overrides[item.id as EntryId]);
      const allTranslations = Object.values(merged).flat();
      const meaningMatch = allTranslations.some((t) => t.toLowerCase().includes(query));

      return hanziMatch || pinyinMatch || meaningMatch;
    });
  }, [allItems, search, filters, overrides, progressByRef]);

  if (loadingData || loadingProgress) {
    return <div className="p-8 text-center animate-pulse text-ink-muted">...</div>;
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-3 px-4 pt-2">
        <h2 className="text-lg font-semibold text-ink">{t('glossary.title')}</h2>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('glossary.search_placeholder')}
            className="w-full border-2 border-ink bg-paper px-3 py-2 text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>

        <FilterPanel
          type={type}
          availableTags={availableTags}
          filters={filters}
          setFilters={setFilters}
          open={filtersOpen}
          setOpen={setFiltersOpen}
        />

        <div className="flex border-b border-ink">
          <button
            onClick={() => setType('character')}
            className={`flex-1 py-2 text-sm font-medium ${
              type === 'character' ? 'border-b-4 border-ink text-ink' : 'text-ink-muted'
            }`}
          >
            {t('glossary.characters')} ({characters.length})
          </button>
          <button
            onClick={() => setType('word')}
            className={`flex-1 py-2 text-sm font-medium ${
              type === 'word' ? 'border-b-4 border-ink text-ink' : 'text-ink-muted'
            }`}
          >
            {t('glossary.words')} ({words.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 scrollbar-hide" data-testid="glossary-list">
        {filteredItems.length === 0 ? (
          <p className="py-8 text-center text-ink-muted">{t('glossary.no_results')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filteredItems.map((item) => {
              const merged = mergeTranslations(item.translations, overrides[item.id as EntryId]);
              const meaning = (merged[currentLang] || merged['en'] || []).join(', ');
              const progress = progressByRef.get(item.id);
              const status = getLearningStatus(item, progress, new Date());

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between border border-ink bg-paper p-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative shrink-0">
                      <span className="text-2xl font-hanzi text-ink">{item.hanzi}</span>
                      <StatusDot status={status} />
                    </div>
                    <SpeakButton text={item.hanzi} size="sm" className="shrink-0" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-medium text-ink-muted">
                        {pinyinToString(item.pinyin)}
                      </span>
                      <span className="line-clamp-1 text-xs text-ink-faint">{meaning}</span>
                    </div>
                  </div>
                  <div className="ml-2 flex shrink-0 flex-col gap-1">
                    <button
                      onClick={() => onShowDetail(item.id)}
                      className="border border-ink px-2 py-1 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-paper"
                      data-testid="glossary-detail-button"
                    >
                      {t('glossary.details')}
                    </button>
                    <button
                      onClick={() => onSelect(item.hanzi)}
                      className="border border-ink px-2 py-1 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-paper"
                    >
                      {t('glossary.practice')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: LearningStatus }) {
  if (status === 'new') return null;

  const colors = {
    learning: 'bg-blue-500', // En cours
    due: 'bg-orange-500', // À réviser
    mastered: 'bg-green-500', // Maîtrisé
  };

  return (
    <div
      className={`absolute -right-1 -top-1 h-2 w-2 rounded-full border border-paper ${colors[status]}`}
      title={status}
    />
  );
}

interface FilterPanelProps {
  type: EntryType;
  availableTags: string[];
  filters: GlossaryFilters;
  setFilters: (next: GlossaryFilters) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

function FilterPanel({
  type,
  availableTags,
  filters,
  setFilters,
  open,
  setOpen,
}: FilterPanelProps) {
  const { t } = useTranslation();
  const activeCount = activeFilterCount(filters);
  const isCharacterTab = type === 'character';

  const toggleTag = (tag: string) => {
    const set = new Set(filters.tags ?? []);
    if (set.has(tag)) set.delete(tag);
    else set.add(tag);
    setFilters({ ...filters, tags: set });
  };

  const toggleStatus = (status: LearningStatus) => {
    const set = new Set(filters.status ?? []);
    if (set.has(status)) set.delete(status);
    else set.add(status);
    setFilters({ ...filters, status: set });
  };

  const updateStrokeRange = (key: 'min' | 'max', raw: string) => {
    const parsed = raw === '' ? null : Number.parseInt(raw, 10);
    const value = parsed === null || Number.isNaN(parsed) ? null : parsed;
    setFilters({ ...filters, strokeCount: { ...filters.strokeCount, [key]: value } });
  };

  const updateFrequencyRange = (key: 'min' | 'max', raw: string) => {
    const parsed = raw === '' ? null : Number.parseInt(raw, 10);
    const value = parsed === null || Number.isNaN(parsed) ? null : parsed;
    setFilters({ ...filters, frequencyRank: { ...filters.frequencyRank, [key]: value } });
  };

  const toggleHskLevel = (level: number) => {
    const set = new Set(filters.hskLevels ?? []);
    if (set.has(level)) set.delete(level);
    else set.add(level);
    setFilters({ ...filters, hskLevels: set });
  };

  const reset = () => setFilters({});

  const statuses: LearningStatus[] = ['new', 'learning', 'due', 'mastered'];
  const hskLevels = [1, 2];

  return (
    <div className="flex flex-col gap-2" data-testid="filter-panel">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="border border-ink px-2 py-1 text-xs font-medium hover:bg-ink hover:text-paper"
          data-testid="filter-toggle"
          aria-expanded={open}
        >
          {t('glossary.filters.toggle')}
          {activeCount > 0 && (
            <span className="ml-1 inline-block min-w-[1.5em] rounded bg-ink px-1 text-paper">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-ink-muted underline hover:text-ink"
            data-testid="filter-reset"
          >
            {t('glossary.filters.reset')}
          </button>
        )}
      </div>

      {open && (
        <div
          className="flex flex-col gap-3 border border-ink p-3 text-sm"
          data-testid="filter-body"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
              {t('glossary.filters.learning_status')}
            </span>
            <div className="flex flex-wrap gap-1">
              {statuses.map((s) => {
                const selected = filters.status?.has(s) ?? false;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatus(s)}
                    className={`border border-ink px-2 py-1 text-xs ${
                      selected ? 'bg-ink text-paper' : ''
                    }`}
                    data-testid={`status-${s}`}
                  >
                    {t(`glossary.filters.status_${s}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
              {t('glossary.filters.hsk_level')}
            </span>
            <div className="flex flex-wrap gap-1">
              {hskLevels.map((level) => {
                const selected = filters.hskLevels?.has(level) ?? false;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => toggleHskLevel(level)}
                    className={`border border-ink px-2 py-1 text-xs ${
                      selected ? 'bg-ink text-paper' : ''
                    }`}
                    data-testid={`hsk-level-${level}`}
                  >
                    {t('glossary.filters.hsk_level_n', { level })}
                  </button>
                );
              })}
            </div>
          </div>

          {availableTags.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                {t('glossary.filters.tags')}
              </span>
              <div className="flex flex-wrap gap-1">
                {availableTags.map((tag) => {
                  const selected = filters.tags?.has(tag) ?? false;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`border border-ink px-2 py-1 text-xs ${
                        selected ? 'bg-ink text-paper' : ''
                      }`}
                      data-testid={`tag-${tag}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs italic text-ink-faint">{t('glossary.filters.no_tags')}</p>
          )}

          {isCharacterTab && (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                  {t('glossary.filters.stroke_count')}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder={t('glossary.filters.min') ?? 'min'}
                    value={filters.strokeCount?.min ?? ''}
                    onChange={(e) => updateStrokeRange('min', e.target.value)}
                    className="w-20 border border-ink bg-paper px-2 py-1 text-sm focus:outline-none"
                    data-testid="filter-stroke-min"
                  />
                  <span className="text-ink-muted">–</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder={t('glossary.filters.max') ?? 'max'}
                    value={filters.strokeCount?.max ?? ''}
                    onChange={(e) => updateStrokeRange('max', e.target.value)}
                    className="w-20 border border-ink bg-paper px-2 py-1 text-sm focus:outline-none"
                    data-testid="filter-stroke-max"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                  {t('glossary.filters.frequency')}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder={t('glossary.filters.min') ?? 'min'}
                    value={filters.frequencyRank?.min ?? ''}
                    onChange={(e) => updateFrequencyRange('min', e.target.value)}
                    className="w-20 border border-ink bg-paper px-2 py-1 text-sm focus:outline-none"
                    data-testid="filter-frequency-min"
                  />
                  <span className="text-ink-muted">–</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder={t('glossary.filters.max') ?? 'max'}
                    value={filters.frequencyRank?.max ?? ''}
                    onChange={(e) => updateFrequencyRange('max', e.target.value)}
                    className="w-20 border border-ink bg-paper px-2 py-1 text-sm focus:outline-none"
                    data-testid="filter-frequency-max"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
