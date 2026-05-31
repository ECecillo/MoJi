import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SpeechProvider as SpeechProviderPort } from '../../domain/ports/SpeechProvider';
import {
  SPEECH_VOICE_STORAGE_KEY,
  SpeechSettingsContext,
  type SpeechSettingsValue,
} from './SpeechSettingsContext';

interface SpeechSettingsProviderProps {
  speechProvider: SpeechProviderPort;
  children: ReactNode;
}

export function SpeechSettingsProvider({ speechProvider, children }: SpeechSettingsProviderProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUriState] = useState(readStoredVoiceUri);

  const refreshVoices = useCallback(() => {
    setVoices(speechProvider.getVoices());
  }, [speechProvider]);

  const setSelectedVoiceUri = useCallback(
    (voiceUri: string) => {
      const normalized = voiceUri.trim();
      setSelectedVoiceUriState(normalized);
      speechProvider.setVoice(normalized.length > 0 ? normalized : null);
      writeStoredVoiceUri(normalized);
    },
    [speechProvider],
  );

  const speak = useCallback(
    (text: string) => {
      speechProvider.speak(text);
    },
    [speechProvider],
  );

  useEffect(() => {
    speechProvider.setVoice(selectedVoiceUri.length > 0 ? selectedVoiceUri : null);
  }, [speechProvider, selectedVoiceUri]);

  useEffect(() => {
    refreshVoices();
    return speechProvider.onVoicesChanged((nextVoices) => {
      setVoices(nextVoices);
    });
  }, [speechProvider, refreshVoices]);

  const value = useMemo<SpeechSettingsValue>(
    () => ({
      voices,
      selectedVoiceUri,
      setSelectedVoiceUri,
      speak,
      refreshVoices,
    }),
    [voices, selectedVoiceUri, setSelectedVoiceUri, speak, refreshVoices],
  );

  return <SpeechSettingsContext.Provider value={value}>{children}</SpeechSettingsContext.Provider>;
}

function readStoredVoiceUri(): string {
  try {
    return window.localStorage.getItem(SPEECH_VOICE_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeStoredVoiceUri(voiceUri: string): void {
  try {
    if (voiceUri.length > 0) {
      window.localStorage.setItem(SPEECH_VOICE_STORAGE_KEY, voiceUri);
    } else {
      window.localStorage.removeItem(SPEECH_VOICE_STORAGE_KEY);
    }
  } catch {
    // localStorage peut être indisponible selon le contexte navigateur.
  }
}
