import { createContext, useContext } from 'react';

export const SPEECH_VOICE_STORAGE_KEY = 'sinogrammes:speech:voice-uri';

export interface SpeechSettingsValue {
  voices: SpeechSynthesisVoice[];
  selectedVoiceUri: string;
  setSelectedVoiceUri: (voiceUri: string) => void;
  speak: (text: string) => void;
  refreshVoices: () => void;
}

const noopSpeechSettings: SpeechSettingsValue = {
  voices: [],
  selectedVoiceUri: '',
  setSelectedVoiceUri: () => undefined,
  speak: () => undefined,
  refreshVoices: () => undefined,
};

export const SpeechSettingsContext = createContext<SpeechSettingsValue>(noopSpeechSettings);

export function useSpeechSettings(): SpeechSettingsValue {
  return useContext(SpeechSettingsContext);
}
