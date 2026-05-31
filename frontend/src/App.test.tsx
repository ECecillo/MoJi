import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { SPEECH_VOICE_STORAGE_KEY } from './features/speech/SpeechSettingsContext';
import i18n from './i18n';

describe('App', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage('fr');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('affiche le titre et le glossaire par défaut', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sinogrammes');
    expect(await screen.findByPlaceholderText(/Chercher/i)).toBeInTheDocument();
    expect(screen.getByTestId('current-language')).toHaveTextContent('fr');
  });

  it('permet de naviguer vers le tracé depuis le glossaire', async () => {
    render(<App />);
    const user = userEvent.setup();

    // Wait for "Tracer" for "你" (it should be in the list)
    const practiceButtons = await screen.findAllByRole('button', { name: /Tracer/i });
    await user.click(practiceButtons[0]!);

    expect(await screen.findByLabelText(/Tracé du caractère/i)).toBeInTheDocument();

    // Test back button
    await user.click(screen.getByRole('button', { name: /←/i }));
    expect(await screen.findByPlaceholderText(/Chercher/i)).toBeInTheDocument();
  });

  it('bascule vers l’anglais quand on clique sur le bouton de langue', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('language-toggle'));

    expect(screen.getByTestId('current-language')).toHaveTextContent('en');
    expect(screen.getByRole('button', { name: /French/i })).toBeInTheDocument();
  });

  it('revient au français après deux bascules', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('language-toggle'));
    await user.click(screen.getByTestId('language-toggle'));

    expect(screen.getByTestId('current-language')).toHaveTextContent('fr');
  });

  it('applique la voix globale aux boutons d’écoute', async () => {
    const { speak } = installSpeechSynthesisMock();
    render(<App />);
    const user = userEvent.setup();

    await screen.findByRole('option', { name: 'HK (zh-HK)' });
    await user.selectOptions(screen.getByTestId('voice-select'), 'voice-hk');

    const speakButtons = await screen.findAllByTestId('speak-button');
    await user.click(speakButtons[0]!);

    expect(window.localStorage.getItem(SPEECH_VOICE_STORAGE_KEY)).toBe('voice-hk');
    expect(speak).toHaveBeenCalled();
    const utterance = vi.mocked(speak).mock.calls[0]![0];
    expect(utterance.voice.voiceURI).toBe('voice-hk');
  });
});

function installSpeechSynthesisMock() {
  const speak = vi.fn();
  const mockSynth = {
    speak,
    cancel: vi.fn(),
    getVoices: vi.fn().mockReturnValue([
      { lang: 'zh-CN', voiceURI: 'voice-cn', name: 'CN' },
      { lang: 'zh-HK', voiceURI: 'voice-hk', name: 'HK' },
      { lang: 'en-US', voiceURI: 'voice-en', name: 'EN' },
    ]),
    speaking: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  vi.stubGlobal('speechSynthesis', mockSynth);
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    vi.fn().mockImplementation((text) => ({ text })),
  );

  return { speak };
}
