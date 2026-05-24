import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import { type SupportedLanguage } from './i18n';
import { Canvas } from './features/canvas/Canvas';
import { HanziWriterRenderer } from './adapters/renderer/HanziWriterRenderer';
import { BundledDataSource } from './adapters/data/BundledDataSource';
import hsk1Data from './data/hsk1.generated.json';
import type { GridType } from './ui/CharacterGrid';
import type { Character } from './domain/schema/types';

export function App() {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'fr') as SupportedLanguage;
  const other: SupportedLanguage = current === 'fr' ? 'en' : 'fr';

  const [gridType, setGridType] = useState<GridType>('tian');
  const [showOutline, setShowOutline] = useState(true);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedHanzi, setSelectedHanzi] = useState('你');

  const dataSource = useMemo(() => new BundledDataSource(hsk1Data), []);
  const renderer = useMemo(() => new HanziWriterRenderer(), []);

  useEffect(() => {
    void dataSource.characters().then((chars) => {
      setCharacters(chars);
      if (chars.length > 0) {
        // Find "你" if possible, otherwise first char
        const ni = chars.find((c) => c.hanzi === '你');
        setSelectedHanzi(ni?.hanzi ?? chars[0]?.hanzi ?? '你');
      }
    });
  }, [dataSource]);

  const toggleLanguage = () => {
    void i18n.changeLanguage(other);
  };

  return (
    <main className="mx-auto flex h-full max-w-xl flex-col items-center gap-6 p-8 overflow-auto">
      <header className="flex w-full justify-between items-center">
        <h1 className="text-xl font-semibold">{t('app.title')}</h1>
        <button
          type="button"
          onClick={toggleLanguage}
          className="rounded border border-ink px-3 py-1 text-xs hover:bg-ink hover:text-paper"
          data-testid="language-toggle"
        >
          {t(`language.${other}`)}
        </button>
      </header>

      <div className="flex flex-col items-center gap-4 py-4 w-full">
        <div className="flex gap-2 items-center w-full overflow-x-auto pb-2 scrollbar-hide">
          {characters.slice(0, 10).map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedHanzi(c.hanzi)}
              className={`flex-shrink-0 w-10 h-10 border border-ink flex items-center justify-center text-lg font-hanzi ${selectedHanzi === c.hanzi ? 'bg-ink text-paper' : ''}`}
            >
              {c.hanzi}
            </button>
          ))}
          {characters.length > 10 && <span className="text-ink-faint text-xs">...</span>}
        </div>

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

      <div className="mt-auto flex flex-col items-center gap-2">
        <p className="text-ink-muted text-sm">Lot 1 — Canvas & Tracé opérationnels.</p>
        <p className="text-xs text-ink-faint" data-testid="current-language">
          {current} • Lot 1
        </p>
      </div>
    </main>
  );
}
