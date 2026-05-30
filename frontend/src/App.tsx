import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import { type SupportedLanguage } from './i18n';
import { Canvas } from './features/canvas/Canvas';
import { Glossary } from './features/glossary/Glossary';
import { EntryDetail } from './features/glossary/EntryDetail';
import { HanziWriterRenderer } from './adapters/renderer/HanziWriterRenderer';
import { BundledDataSource } from './adapters/data/BundledDataSource';
import hsk1Data from './data/hsk1.generated.json';
import { countDue, pickNextDue } from './lib/srs/dueQueue';
import { useProgress } from './features/progress/useProgress';
import type { Character, Word } from './domain/schema/types';
import type { GridType } from './ui/CharacterGrid';

type View = 'glossary' | 'detail' | 'practice';

export function App() {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'fr') as SupportedLanguage;
  const other: SupportedLanguage = current === 'fr' ? 'en' : 'fr';

  const [view, setView] = useState<View>('glossary');
  const [gridType, setGridType] = useState<GridType>('tian');
  const [showOutline, setShowOutline] = useState(true);
  const [selectedHanzi, setSelectedHanzi] = useState('你');
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [words, setWords] = useState<Word[]>([]);

  const renderer = useMemo(() => new HanziWriterRenderer(), []);
  const dataSource = useMemo(() => new BundledDataSource(hsk1Data), []);
  const { entries, recordSession } = useProgress();

  // Charge le bundle pour pouvoir résoudre hanzi → entryId et bouton Réviser
  // → hanzi à pratiquer.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [chars, wrds] = await Promise.all([dataSource.characters(), dataSource.words()]);
        if (cancelled) return;
        setCharacters(chars);
        setWords(wrds);
      } catch (error) {
        console.error('Failed to load reference data:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataSource]);

  const today = useMemo(() => new Date(), []);
  const dueCount = countDue(entries, today);

  const toggleLanguage = () => {
    void i18n.changeLanguage(other);
  };

  const handleSelect = (hanzi: string) => {
    setSelectedHanzi(hanzi);
    setView('practice');
  };

  const handleShowDetail = (entryId: string) => {
    setDetailEntryId(entryId);
    setView('detail');
  };

  const handleBackToGlossary = () => {
    setDetailEntryId(null);
    setView('glossary');
  };

  const handleBackFromPractice = () => {
    if (detailEntryId !== null) {
      setView('detail');
    } else {
      setView('glossary');
    }
  };

  const handleReview = () => {
    const next = pickNextDue(entries, today);
    if (!next) return;
    const targetHanzi = resolveHanziFromRef(next.ref.id, characters, words);
    if (!targetHanzi) return;
    setSelectedHanzi(targetHanzi);
    setView('practice');
  };

  // Quand l'utilisateur termine un caractère : on résout la Character à
  // partir du hanzi pratiqué (premier match côté caractères, qui est l'unité
  // de progression principale du Lot 3) et on enregistre une session.
  const handleCharacterCompleted = ({ refusals }: { refusals: number; completed: true }) => {
    const matched = characters.find((c) => c.hanzi === selectedHanzi);
    if (!matched) return;
    void recordSession({ type: 'character', id: matched.id }, { refusals, completed: true });
  };

  return (
    <main className="mx-auto flex h-full max-w-xl flex-col items-center gap-4 p-4 overflow-hidden bg-paper text-ink">
      <header className="flex w-full justify-between items-center px-2 shrink-0">
        <div className="flex items-center gap-2">
          {view === 'practice' && (
            <button
              onClick={handleBackFromPractice}
              className="mr-2 border border-ink px-2 py-1 text-xs font-bold"
            >
              ←
            </button>
          )}
          <h1 className="text-xl font-semibold">{t('app.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          {view === 'glossary' && (
            <button
              type="button"
              onClick={handleReview}
              disabled={dueCount === 0}
              className="border border-ink px-3 py-1 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink hover:text-paper"
              data-testid="review-button"
            >
              {t('review.button', { count: dueCount })}
            </button>
          )}
          <button
            type="button"
            onClick={toggleLanguage}
            className="rounded border border-ink px-3 py-1 text-xs hover:bg-ink hover:text-paper"
            data-testid="language-toggle"
          >
            {t(`language.${other}`)}
          </button>
        </div>
      </header>

      <div className="flex-1 w-full overflow-hidden flex flex-col">
        {view === 'glossary' ? (
          <Glossary onSelect={handleSelect} onShowDetail={handleShowDetail} />
        ) : view === 'detail' && detailEntryId !== null ? (
          <EntryDetail
            entryId={detailEntryId}
            onBack={handleBackToGlossary}
            onPractice={handleSelect}
            onShowDetail={handleShowDetail}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 py-4 w-full overflow-y-auto scrollbar-hide">
            <Canvas
              hanzi={selectedHanzi}
              renderer={renderer}
              size={320}
              gridType={gridType}
              showOutline={showOutline}
              onCharacterCompleted={handleCharacterCompleted}
            />

            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <button
                onClick={() => setGridType('tian')}
                className={`px-3 py-1 border border-ink text-xs ${gridType === 'tian' ? 'bg-ink text-paper' : ''}`}
              >
                Tian
              </button>
              <button
                onClick={() => setGridType('mi')}
                className={`px-3 py-1 border border-ink text-xs ${gridType === 'mi' ? 'bg-ink text-paper' : ''}`}
              >
                Mi
              </button>
              <button
                onClick={() => setGridType('hui')}
                className={`px-3 py-1 border border-ink text-xs ${gridType === 'hui' ? 'bg-ink text-paper' : ''}`}
              >
                Hui
              </button>
              <button
                onClick={() => setShowOutline(!showOutline)}
                className={`px-3 py-1 border border-ink text-xs ${showOutline ? 'bg-ink text-paper' : ''}`}
              >
                {showOutline ? 'Hide Outline' : 'Show Outline'}
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="shrink-0 flex flex-col items-center gap-1 py-2 border-t border-ink w-full">
        <p className="text-xs text-ink-faint" data-testid="current-language">
          {current} • Lot 3 — Révision (sprint 1)
        </p>
      </footer>
    </main>
  );
}

function resolveHanziFromRef(
  id: string,
  characters: ReadonlyArray<Character>,
  words: ReadonlyArray<Word>,
): string | null {
  if (id.startsWith('char_')) {
    return characters.find((c) => c.id === id)?.hanzi ?? null;
  }
  if (id.startsWith('word_')) {
    return words.find((w) => w.id === id)?.hanzi ?? null;
  }
  return null;
}
