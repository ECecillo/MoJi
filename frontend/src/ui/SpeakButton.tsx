import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { WebSpeechProvider } from '../adapters/speech/WebSpeechProvider';

interface SpeakButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SpeakButton({ text, className = '', size = 'md' }: SpeakButtonProps) {
  const { t } = useTranslation();
  const speechProvider = useMemo(() => new WebSpeechProvider(), []);

  const sizes = {
    sm: 'p-1 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    speechProvider.speak(text);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={t('common.listen')}
      className={`rounded border border-ink hover:bg-ink hover:text-paper focus:outline-none focus:ring-2 focus:ring-ink active:scale-95 transition-all ${sizes[size]} ${className}`}
      data-testid="speak-button"
    >
      <span role="img" aria-label={t('common.listen')}>
        🔊
      </span>
    </button>
  );
}
