import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadBundledDataSource } from '../../adapters/data/bundledReferenceData';
import { pinyinToString } from '../../lib/pinyin';
import { mergeTranslations } from '../../lib/translations';
import { useTranslationOverrides } from './useTranslationOverrides';
import { useProgress } from '../progress/useProgress';
import { getLearningStatus } from '../../lib/glossaryFilters';
import type { Character, Translations, Word } from '../../domain/schema/types';
import type { EntryId, OverrideMap } from '../../domain/ports/TranslationOverrideRepository';
import { SpeakButton } from '../../ui/SpeakButton';

interface EntryDetailProps {
  entryId: string;
  onBack: () => void;
  onPractice: (hanzi: string) => void;
  onShowDetail: (entryId: string) => void;
}

type Entry = { kind: 'character'; data: Character } | { kind: 'word'; data: Word };

export function EntryDetail({ entryId, onBack, onPractice, onShowDetail }: EntryDetailProps) {
  const { t, i18n } = useTranslation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const currentLang = i18n.resolvedLanguage || 'fr';
  const { overrides, setOverride } = useTranslationOverrides();
  const { entries: progressEntries, loading: loadingProgress } = useProgress();

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
        console.error('Failed to load detail data:', error);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const entry: Entry | null = useMemo(() => {
    if (entryId.startsWith('char_')) {
      const found = characters.find((c) => c.id === entryId);
      return found ? { kind: 'character', data: found } : null;
    }
    if (entryId.startsWith('word_')) {
      const found = words.find((w) => w.id === entryId);
      return found ? { kind: 'word', data: found } : null;
    }
    return null;
  }, [entryId, characters, words]);

  const progress = useMemo(
    () => progressEntries.find((e) => e.ref.id === entryId),
    [progressEntries, entryId],
  );

  if (loadingData || loadingProgress) {
    return <div className="p-8 text-center animate-pulse text-ink-muted">...</div>;
  }

  if (!entry) {
    return (
      <div className="flex h-full w-full flex-col gap-4 p-4">
        <button
          onClick={onBack}
          className="self-start border border-ink px-2 py-1 text-xs font-bold"
        >
          ← {t('glossary.detail.back')}
        </button>
        <p className="text-center text-ink-muted">{t('glossary.detail.not_found')}</p>
      </div>
    );
  }

  const { hanzi, pinyin, translations } = entry.data;
  const mergedTranslations: Translations = mergeTranslations(
    translations,
    overrides[entry.data.id],
  );
  const translationsByLang = Object.entries(mergedTranslations);

  return (
    <div
      className="flex h-full w-full flex-col gap-4 overflow-y-auto px-4 pb-8 pt-2 scrollbar-hide"
      data-testid="entry-detail"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="border border-ink px-2 py-1 text-xs font-bold"
          data-testid="detail-back"
        >
          ← {t('glossary.detail.back')}
        </button>
        <button
          onClick={() => onPractice(hanzi)}
          className="border-2 border-ink bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wider text-paper"
          data-testid="detail-practice"
        >
          {t('glossary.detail.practice')} {hanzi}
        </button>
      </div>

      <header className="flex flex-col items-center gap-1 border-b border-ink pb-4">
        <div className="flex items-center gap-4">
          <span className="text-6xl font-hanzi text-ink" data-testid="detail-hanzi">
            {hanzi}
          </span>
          <SpeakButton text={hanzi} size="lg" />
        </div>
        <span className="text-lg text-ink" data-testid="detail-pinyin">
          {pinyinToString(pinyin)}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
            {t('glossary.detail.facts')}
          </h3>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-muted">{t('glossary.detail.hsk')}</dt>
            <dd className="text-ink">{entry.data.hsk_level}</dd>

            {entry.kind === 'character' && (
              <>
                <dt className="text-ink-muted">{t('glossary.detail.stroke_count')}</dt>
                <dd className="text-ink">{entry.data.stroke_count}</dd>

                <dt className="text-ink-muted">{t('glossary.detail.radicals')}</dt>
                <dd className="font-hanzi text-ink">
                  {entry.data.radicals.length > 0 ? entry.data.radicals.join(' ') : '—'}
                </dd>

                {entry.data.frequency_rank !== undefined && (
                  <>
                    <dt className="text-ink-muted">{t('glossary.detail.frequency')}</dt>
                    <dd className="text-ink">#{entry.data.frequency_rank}</dd>
                  </>
                )}
              </>
            )}
          </dl>
        </section>

        {progress && (
          <section className="flex flex-col gap-2" data-testid="detail-progress">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
              {t('glossary.detail.progress')}
            </h3>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-ink-muted">{t('glossary.detail.learning_status')}</dt>
              <dd className="font-medium text-ink">
                {t(
                  `glossary.filters.status_${getLearningStatus(entry.data, progress, new Date())}`,
                )}
              </dd>

              <dt className="text-ink-muted">{t('glossary.detail.attempts')}</dt>
              <dd className="text-ink">{progress.stats.attempts}</dd>

              <dt className="text-ink-muted">{t('glossary.detail.successes')}</dt>
              <dd className="text-ink">{progress.stats.successes}</dd>

              <dt className="text-ink-muted">{t('glossary.detail.last_seen')}</dt>
              <dd className="text-ink">{progress.stats.last_seen}</dd>

              <dt className="text-ink-muted">{t('glossary.detail.next_review')}</dt>
              <dd className="text-ink">{progress.srs_state.due}</dd>
            </dl>
          </section>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
          {t('glossary.detail.meanings')}
        </h3>
        {translationsByLang.length === 0 &&
        !translationsByLang.some(([lang]) => lang === currentLang) ? (
          <p className="text-sm text-ink-faint">{t('glossary.detail.no_translations')}</p>
        ) : null}

        {sortLanguagesWithCurrentFirst(translationsByLang, currentLang).map(([lang, items]) => (
          <LanguageSection
            key={lang}
            entryId={entry.data.id as EntryId}
            lang={lang}
            items={items}
            isOverridden={Boolean(overrides[entry.data.id as EntryId]?.[lang])}
            currentLang={currentLang}
            onSave={(values) => setOverride(entry.data.id as EntryId, lang, values)}
          />
        ))}

        {/* Permettre d'ajouter une langue absente du bundle (typiquement FR
            quand le bundle n'a que de l'anglais). Affichée seulement si la
            langue courante n'est pas déjà présente. */}
        {!translationsByLang.some(([lang]) => lang === currentLang) && (
          <LanguageSection
            entryId={entry.data.id as EntryId}
            lang={currentLang}
            items={[]}
            isOverridden={false}
            currentLang={currentLang}
            onSave={(values) => setOverride(entry.data.id as EntryId, currentLang, values)}
          />
        )}
      </section>

      {entry.kind === 'character' && (
        <CharacterWordsSection
          characterId={entry.data.id}
          words={words}
          overrides={overrides}
          currentLang={currentLang}
          onShowDetail={onShowDetail}
        />
      )}

      {entry.kind === 'word' && (
        <WordCharactersSection
          word={entry.data}
          characters={characters}
          onShowDetail={onShowDetail}
        />
      )}

      {entry.kind === 'word' && entry.data.examples.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
            {t('glossary.detail.examples')}
          </h3>
          <ul className="flex flex-col gap-2">
            {entry.data.examples.map((ex, idx) => (
              <li key={idx} className="border border-ink p-2 text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-hanzi text-lg text-ink">{ex.hanzi}</span>
                  {ex.pinyin && (
                    <span className="text-xs text-ink-muted">{pinyinToString(ex.pinyin)}</span>
                  )}
                </div>
                <p className="text-xs text-ink-faint">
                  {(ex.translations[currentLang] || ex.translations['en'] || []).join(', ')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function sortLanguagesWithCurrentFirst<T>(
  pairs: Array<[string, T]>,
  currentLang: string,
): Array<[string, T]> {
  return [...pairs].sort(([a], [b]) => {
    if (a === currentLang) return -1;
    if (b === currentLang) return 1;
    return a.localeCompare(b);
  });
}

interface LanguageSectionProps {
  entryId: EntryId;
  lang: string;
  items: string[];
  isOverridden: boolean;
  currentLang: string;
  onSave: (values: string[]) => Promise<void>;
}

function LanguageSection({
  entryId,
  lang,
  items,
  isOverridden,
  currentLang,
  onSave,
}: LanguageSectionProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(items);
  const [saving, setSaving] = useState(false);

  // Si les items changent depuis l'extérieur (autre lang ajoutée par exemple),
  // refléter dans le draft tant qu'on n'édite pas.
  useEffect(() => {
    if (!editing) setDraft(items);
  }, [items, editing]);

  const startEdit = () => {
    setDraft(items.length === 0 ? [''] : [...items]);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(items);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft.map((s) => s.trim()).filter((s) => s.length > 0));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const langLabel = t(`language.${lang}`, { defaultValue: lang });
  const isCurrent = lang === currentLang;
  const showOverrideMark = isOverridden;

  return (
    <div className="flex flex-col gap-1" data-testid={`translations-${lang}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
          {langLabel}
          {showOverrideMark && (
            <span
              className="ml-2 normal-case text-ink-faint"
              data-testid={`override-marker-${lang}`}
              title={t('glossary.detail.overridden_title') ?? ''}
            >
              ✎
            </span>
          )}
        </span>
        {!editing && isCurrent && (
          <button
            type="button"
            onClick={startEdit}
            className="border border-ink px-2 py-0.5 text-xs hover:bg-ink hover:text-paper"
            data-testid={`edit-translations-${lang}`}
          >
            {items.length === 0
              ? t('glossary.detail.add_translation')
              : t('glossary.detail.edit_translations')}
          </button>
        )}
      </div>

      {!editing ? (
        items.length > 0 ? (
          <ul className="ml-4 list-disc text-sm text-ink">
            {items.map((meaning, idx) => (
              <li key={`${lang}-${idx}`}>{meaning}</li>
            ))}
          </ul>
        ) : (
          <p className="ml-4 text-xs italic text-ink-faint">
            {t('glossary.detail.no_translations_for_language', { lang: langLabel })}
          </p>
        )
      ) : (
        <EditableTranslations
          entryId={entryId}
          lang={lang}
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={cancel}
          saving={saving}
        />
      )}
    </div>
  );
}

interface EditableTranslationsProps {
  entryId: EntryId;
  lang: string;
  draft: string[];
  setDraft: (next: string[]) => void;
  onSave: () => Promise<void> | void;
  onCancel: () => void;
  saving: boolean;
}

function EditableTranslations({
  entryId,
  lang,
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
}: EditableTranslationsProps) {
  const { t } = useTranslation();

  const update = (idx: number, value: string) =>
    setDraft(draft.map((v, i) => (i === idx ? value : v)));
  const remove = (idx: number) => setDraft(draft.filter((_, i) => i !== idx));
  const add = () => setDraft([...draft, '']);

  return (
    <div className="ml-2 flex flex-col gap-2" data-testid={`edit-mode-${entryId}-${lang}`}>
      {draft.map((value, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => update(idx, e.target.value)}
            className="flex-1 border border-ink bg-paper px-2 py-1 text-sm"
            placeholder={t('glossary.detail.translation_placeholder') ?? ''}
            data-testid="translation-input"
            ref={(el) => {
              if (el && idx === draft.length - 1) el.focus();
            }}
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="border border-ink px-2 py-1 text-xs hover:bg-ink hover:text-paper"
            aria-label={t('glossary.detail.remove_translation') ?? ''}
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={add}
          className="border border-ink px-2 py-1 text-xs hover:bg-ink hover:text-paper"
          data-testid="add-translation"
        >
          + {t('glossary.detail.add_translation')}
        </button>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="border-2 border-ink bg-ink px-3 py-1 text-xs font-bold uppercase text-paper disabled:opacity-50"
          data-testid="save-translations"
        >
          {t('glossary.detail.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="border border-ink px-3 py-1 text-xs disabled:opacity-50"
          data-testid="cancel-translations"
        >
          {t('glossary.detail.cancel')}
        </button>
      </div>
    </div>
  );
}

interface CharacterWordsSectionProps {
  characterId: string;
  words: Word[];
  overrides: OverrideMap;
  currentLang: string;
  onShowDetail: (id: string) => void;
}

function CharacterWordsSection({
  characterId,
  words,
  overrides,
  currentLang,
  onShowDetail,
}: CharacterWordsSectionProps) {
  const { t } = useTranslation();
  const related = words.filter((w) => w.character_refs.includes(characterId as `char_${string}`));

  if (related.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
        {t('glossary.detail.appears_in_words')} ({related.length})
      </h3>
      <ul className="flex flex-col gap-1">
        {related.map((w) => {
          const merged = mergeTranslations(w.translations, overrides[w.id as EntryId]);
          const display = (merged[currentLang] || merged['en'] || []).slice(0, 2).join(', ');
          return (
            <li key={w.id}>
              <button
                onClick={() => onShowDetail(w.id)}
                className="flex w-full items-baseline gap-2 border border-ink bg-paper p-2 text-left hover:bg-ink hover:text-paper"
                data-testid="related-word"
              >
                <span className="font-hanzi text-lg">{w.hanzi}</span>
                <span className="text-xs text-ink-muted">{pinyinToString(w.pinyin)}</span>
                <span className="line-clamp-1 flex-1 text-xs text-ink-faint">{display}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface WordCharactersSectionProps {
  word: Word;
  characters: Character[];
  onShowDetail: (id: string) => void;
}

function WordCharactersSection({ word, characters, onShowDetail }: WordCharactersSectionProps) {
  const { t } = useTranslation();
  const refs = word.character_refs
    .map((id) => characters.find((c) => c.id === id))
    .filter((c): c is Character => c !== undefined);

  if (refs.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
        {t('glossary.detail.constituent_characters')}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {refs.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => onShowDetail(c.id)}
              className="flex flex-col items-center border border-ink bg-paper px-3 py-2 hover:bg-ink hover:text-paper"
              data-testid="constituent-character"
            >
              <span className="font-hanzi text-2xl">{c.hanzi}</span>
              <span className="text-xs text-ink-muted">{pinyinToString(c.pinyin)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
