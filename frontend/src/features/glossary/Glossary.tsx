import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BundledDataSource } from '../../adapters/data/BundledDataSource';
import hsk1Data from '../../data/hsk1.generated.json';
import { pinyinToAscii, pinyinToString } from '../../lib/pinyin';
import type { Character, Word } from '../../domain/schema/types';

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
  const [loading, setLoading] = useState(true);

  const dataSource = useMemo(() => new BundledDataSource(hsk1Data), []);

  useEffect(() => {
    async function loadData() {
      try {
        const [chars, wrds] = await Promise.all([dataSource.characters(), dataSource.words()]);
        setCharacters(chars);
        setWords(wrds);
      } catch (error) {
        console.error('Failed to load glossary data:', error);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [dataSource]);

  const currentLang = i18n.resolvedLanguage || 'fr';

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase().trim();
    const items = type === 'character' ? characters : words;

    if (!query) return items;

    return items.filter((item) => {
      const hanziMatch = item.hanzi.includes(query);
      // Recherche pinyin insensible aux diacritiques : tape "ni" et "nǐ" matche.
      const pinyinAscii = pinyinToAscii(item.pinyin).toLowerCase();
      const pinyinWithTones = pinyinToString(item.pinyin).toLowerCase();
      const pinyinMatch = pinyinAscii.includes(query) || pinyinWithTones.includes(query);

      const allTranslations = Object.values(item.translations).flat();
      const meaningMatch = allTranslations.some((t) => t.toLowerCase().includes(query));

      return hanziMatch || pinyinMatch || meaningMatch;
    });
  }, [type, search, characters, words]);

  if (loading) {
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
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between border border-ink bg-paper p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-hanzi text-ink">{item.hanzi}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-ink-muted">
                      {pinyinToString(item.pinyin)}
                    </span>
                    <span className="line-clamp-1 text-xs text-ink-faint">
                      {(item.translations[currentLang] || item.translations['en'] || []).join(', ')}
                    </span>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
