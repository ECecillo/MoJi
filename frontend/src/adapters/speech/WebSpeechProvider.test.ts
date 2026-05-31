import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSpeechProvider } from './WebSpeechProvider';

describe('WebSpeechProvider', () => {
  let provider: WebSpeechProvider;
  let mockSynth: any;

  beforeEach(() => {
    mockSynth = {
      speak: vi.fn(),
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

    provider = new WebSpeechProvider();
  });

  it('speak appelle speechSynthesis.speak avec le bon texte', () => {
    provider.speak('你好');

    expect(mockSynth.speak).toHaveBeenCalled();
    const utterance = vi.mocked(mockSynth.speak).mock.calls[0]![0];
    expect(utterance.text).toBe('你好');
  });

  it('speak annule la lecture en cours si nécessaire', () => {
    mockSynth.speaking = true;
    provider.speak('test');
    expect(mockSynth.cancel).toHaveBeenCalled();
  });

  it('getVoices filtre les voix chinoises', () => {
    const voices = provider.getVoices();
    expect(voices).toHaveLength(2);
    expect(voices.every((v) => v.lang.startsWith('zh'))).toBe(true);
  });

  it('setVoice permet de changer la voix utilisée', () => {
    provider.setVoice('voice-hk');
    provider.speak('test');

    const utterance = vi.mocked(mockSynth.speak).mock.calls[0]![0];
    expect(utterance.voice.voiceURI).toBe('voice-hk');
  });
});
