import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpeechProvider } from '../../domain/ports/SpeechProvider';
import i18n from '../../i18n';
import { SPEECH_VOICE_STORAGE_KEY, useSpeechSettings } from './SpeechSettingsContext';
import { SpeechSettingsProvider } from './SpeechSettingsProvider';
import { VoiceSelect } from './VoiceSelect';

describe('SpeechSettingsProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('charge les voix disponibles depuis le provider vocal', async () => {
    const mock = makeSpeechProvider([
      voice('voice-cn', 'CN', 'zh-CN'),
      voice('voice-hk', 'HK', 'zh-HK'),
    ]);

    render(
      <SpeechSettingsProvider speechProvider={mock.speechProvider}>
        <Probe />
      </SpeechSettingsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('voice-count')).toHaveTextContent('2'));
    expect(mock.getVoices).toHaveBeenCalled();
  });

  it('lit et applique la voix persistée', async () => {
    window.localStorage.setItem(SPEECH_VOICE_STORAGE_KEY, 'voice-hk');
    const mock = makeSpeechProvider([voice('voice-hk', 'HK', 'zh-HK')]);

    render(
      <SpeechSettingsProvider speechProvider={mock.speechProvider}>
        <Probe />
      </SpeechSettingsProvider>,
    );

    await waitFor(() => expect(mock.setVoice).toHaveBeenCalledWith('voice-hk'));
    expect(screen.getByTestId('selected-voice')).toHaveTextContent('voice-hk');
  });

  it('persiste le choix de voix et délègue la lecture au provider', async () => {
    const user = userEvent.setup();
    const mock = makeSpeechProvider([
      voice('voice-cn', 'CN', 'zh-CN'),
      voice('voice-hk', 'HK', 'zh-HK'),
    ]);

    render(
      <SpeechSettingsProvider speechProvider={mock.speechProvider}>
        <Probe />
      </SpeechSettingsProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'select HK' }));
    await user.click(screen.getByRole('button', { name: 'speak' }));

    expect(mock.setVoice).toHaveBeenLastCalledWith('voice-hk');
    expect(mock.speak).toHaveBeenCalledWith('你好');
    expect(window.localStorage.getItem(SPEECH_VOICE_STORAGE_KEY)).toBe('voice-hk');
  });

  it('met à jour la liste quand le navigateur publie voiceschanged', async () => {
    const mock = makeSpeechProvider([voice('voice-cn', 'CN', 'zh-CN')]);

    render(
      <SpeechSettingsProvider speechProvider={mock.speechProvider}>
        <Probe />
      </SpeechSettingsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('voice-count')).toHaveTextContent('1'));

    act(() => {
      mock.emitVoicesChanged([voice('voice-tw', 'TW', 'zh-TW'), voice('voice-hk', 'HK', 'zh-HK')]);
    });

    expect(screen.getByTestId('voice-count')).toHaveTextContent('2');
  });
});

describe('VoiceSelect', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage('fr');
  });

  it('permet de sélectionner une voix globale', async () => {
    const user = userEvent.setup();
    const mock = makeSpeechProvider([
      voice('voice-cn', 'CN', 'zh-CN'),
      voice('voice-hk', 'HK', 'zh-HK'),
    ]);

    render(
      <SpeechSettingsProvider speechProvider={mock.speechProvider}>
        <VoiceSelect />
      </SpeechSettingsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'HK (zh-HK)' })).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId('voice-select'), 'voice-hk');

    expect(mock.setVoice).toHaveBeenLastCalledWith('voice-hk');
    expect(window.localStorage.getItem(SPEECH_VOICE_STORAGE_KEY)).toBe('voice-hk');
  });
});

function Probe() {
  const { voices, selectedVoiceUri, setSelectedVoiceUri, speak } = useSpeechSettings();

  return (
    <>
      <p data-testid="voice-count">{voices.length}</p>
      <p data-testid="selected-voice">{selectedVoiceUri}</p>
      <button type="button" onClick={() => setSelectedVoiceUri('voice-hk')}>
        select HK
      </button>
      <button type="button" onClick={() => speak('你好')}>
        speak
      </button>
    </>
  );
}

function makeSpeechProvider(initialVoices: SpeechSynthesisVoice[]) {
  let currentVoices = initialVoices;
  let voicesChanged: (voices: SpeechSynthesisVoice[]) => void = () => undefined;
  const unsubscribe = vi.fn();
  const speak = vi.fn();
  const setVoice = vi.fn();
  const getVoices = vi.fn(() => currentVoices);
  const onVoicesChanged = vi.fn((callback: (voices: SpeechSynthesisVoice[]) => void) => {
    voicesChanged = callback;
    return unsubscribe;
  });

  const speechProvider: SpeechProvider = {
    speak,
    setVoice,
    getVoices,
    onVoicesChanged,
  };

  return {
    speechProvider,
    speak,
    setVoice,
    getVoices,
    onVoicesChanged,
    unsubscribe,
    emitVoicesChanged(nextVoices: SpeechSynthesisVoice[]) {
      currentVoices = nextVoices;
      voicesChanged(nextVoices);
    },
  };
}

function voice(voiceURI: string, name: string, lang: string): SpeechSynthesisVoice {
  return { voiceURI, name, lang } as SpeechSynthesisVoice;
}
