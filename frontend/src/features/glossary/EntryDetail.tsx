import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BundledDataSource } from '../../adapters/data/BundledDataSource';
import hsk1Data from '../../data/hsk1.generated.json';
import { pinyinToString } from '../../lib/pinyin';
import type { Character, Word } from '../../domain/schema/types';

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
  const [loading, setLoading] = useState(true);

  const dataSource = useMemo(() => new BundledDataSource(hsk1Data), []);
  const currentLang = i18n.resolvedLanguage || 'fr';

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [chars, wrds] = await Promise.all([dataSource.characters(), dataSource.words()]);
        if (cancelled) return;
        setCharacters(chars);
        setWords(wrds);
      } catch (error) {
        console.error('Failed to load detail data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [dataSource]);

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

  if (loading) {
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
  const translationsByLang = Object.entries(translations);

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
        <span className="text-6xl font-hanzi text-ink" data-testid="detail-hanzi">
          {hanzi}
        </span>
        <span className="text-lg text-ink" data-testid="detail-pinyin">
          {pinyinToString(pinyin)}
        </span>
      </header>

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

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
          {t('glossary.detail.meanings')}
        </h3>
        {translationsByLang.length === 0 ? (
          <p className="text-sm text-ink-faint">{t('glossary.detail.no_translations')}</p>
        ) : (
          translationsByLang
            .sort(([a], [b]) => {
              if (a === currentLang) return -1;
              if (b === currentLang) return 1;
              return a.localeCompare(b);
            })
            .map(([lang, items]) => (
              <div key={lang} className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                  {t(`language.${lang}`, { defaultValue: lang })}
                </span>
                <ul className="ml-4 list-disc text-sm text-ink">
                  {items.map((meaning, idx) => (
                    <li key={`${lang}-${idx}`}>{meaning}</li>
                  ))}
                </ul>
              </div>
            ))
        )}
      </section>

      {entry.kind === 'character' && (
        <CharacterWordsSection
          characterId={entry.data.id}
          words={words}
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

interface CharacterWordsSectionProps {
  characterId: string;
  words: Word[];
  currentLang: string;
  onShowDetail: (id: string) => void;
}

function CharacterWordsSection({
  characterId,
  words,
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
        {related.map((w) => (
          <li key={w.id}>
            <button
              onClick={() => onShowDetail(w.id)}
              className="flex w-full items-baseline gap-2 border border-ink bg-paper p-2 text-left hover:bg-ink hover:text-paper"
              data-testid="related-word"
            >
              <span className="font-hanzi text-lg">{w.hanzi}</span>
              <span className="text-xs text-ink-muted">{pinyinToString(w.pinyin)}</span>
              <span className="line-clamp-1 flex-1 text-xs text-ink-faint">
                {(w.translations[currentLang] || w.translations['en'] || []).slice(0, 2).join(', ')}
              </span>
            </button>
          </li>
        ))}
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
