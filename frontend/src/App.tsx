import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { type SupportedLanguage } from './i18n';
import { Canvas } from './features/canvas/Canvas';
import { Glossary } from './features/glossary/Glossary';
import { HanziWriterRenderer } from './adapters/renderer/HanziWriterRenderer';
import type { GridType } from './ui/CharacterGrid';

type View = 'glossary' | 'practice';

export function App() {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'fr') as SupportedLanguage;
  const other: SupportedLanguage = current === 'fr' ? 'en' : 'fr';

  const [view, setView] = useState<View>('glossary');
  const [gridType, setGridType] = useState<GridType>('tian');
  const [showOutline, setShowOutline] = useState(true);
  const [selectedHanzi, setSelectedHanzi] = useState('你');

  const renderer = useMemo(() => new HanziWriterRenderer(), []);

  const toggleLanguage = () => {
    void i18n.changeLanguage(other);
  };

  const handleSelect = (hanzi: string) => {
    setSelectedHanzi(hanzi);
    setView('practice');
  };

  return (
    <main className="mx-auto flex h-full max-w-xl flex-col items-center gap-4 p-4 overflow-hidden bg-paper text-ink">
      <header className="flex w-full justify-between items-center px-2 shrink-0">
        <div className="flex items-center gap-2">
          {view === 'practice' && (
            <button
              onClick={() => setView('glossary')}
              className="mr-2 border border-ink px-2 py-1 text-xs font-bold"
            >
              ←
            </button>
          )}
          <h1 className="text-xl font-semibold">{t('app.title')}</h1>
        </div>
        <button
          type="button"
          onClick={toggleLanguage}
          className="rounded border border-ink px-3 py-1 text-xs hover:bg-ink hover:text-paper"
          data-testid="language-toggle"
        >
          {t(`language.${other}`)}
        </button>
      </header>

      <div className="flex-1 w-full overflow-hidden flex flex-col">
        {view === 'glossary' ? (
          <Glossary onSelect={handleSelect} />
        ) : (
          <div className="flex flex-col items-center gap-4 py-4 w-full overflow-y-auto scrollbar-hide">
            <Canvas
              hanzi={selectedHanzi}
              renderer={renderer}
              size={320}
              gridType={gridType}
              showOutline={showOutline}
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
          {current} • Lot 2 — Glossaire
        </p>
      </footer>
    </main>
  );
}
