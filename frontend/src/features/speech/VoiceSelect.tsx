import { useTranslation } from 'react-i18next';
import { useSpeechSettings } from './SpeechSettingsContext';

interface VoiceSelectProps {
  className?: string;
}

export function VoiceSelect({ className = '' }: VoiceSelectProps) {
  const { t } = useTranslation();
  const { voices, selectedVoiceUri, setSelectedVoiceUri } = useSpeechSettings();
  const selectedVoiceExists = voices.some((voice) => voice.voiceURI === selectedVoiceUri);
  const value = selectedVoiceExists ? selectedVoiceUri : '';

  return (
    <select
      aria-label={t('speech.voice_select')}
      title={t('speech.voice_select')}
      value={value}
      onChange={(event) => setSelectedVoiceUri(event.currentTarget.value)}
      disabled={voices.length === 0}
      className={`max-w-36 rounded border border-ink bg-paper px-2 py-1 text-xs text-ink disabled:opacity-40 ${className}`}
      data-testid="voice-select"
    >
      <option value="">
        {voices.length === 0 ? t('speech.no_voices') : t('speech.automatic')}
      </option>
      {voices.map((voice) => (
        <option key={voice.voiceURI} value={voice.voiceURI}>
          {voice.name} ({voice.lang})
        </option>
      ))}
    </select>
  );
}
