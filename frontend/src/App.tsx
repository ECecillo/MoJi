import { useTranslation } from 'react-i18next';
import { supportedLanguages, type SupportedLanguage } from './i18n';

export function App() {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'fr') as SupportedLanguage;
  const other: SupportedLanguage = current === 'fr' ? 'en' : 'fr';

  const toggleLanguage = () => {
    void i18n.changeLanguage(other);
  };

  return (
    <main className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">{t('app.title')}</h1>
      <p className="text-lg">{t('app.greeting')}</p>
      <p className="text-ink-muted">{t('app.lot')}</p>

      <button
        type="button"
        onClick={toggleLanguage}
        className="rounded border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-paper"
        aria-label={t('language.toggle')}
        data-testid="language-toggle"
      >
        {t(`language.${other}`)}
      </button>

      <p className="text-xs text-ink-faint" data-testid="current-language">
        {current}
      </p>

      <p className="sr-only" aria-hidden="true">
        {supportedLanguages.join(',')}
      </p>
    </main>
  );
}
