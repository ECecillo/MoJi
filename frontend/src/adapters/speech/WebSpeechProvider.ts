import type { SpeechProvider } from '../../domain/ports/SpeechProvider';

export class WebSpeechProvider implements SpeechProvider {
  private readonly synth: SpeechSynthesis;
  private selectedVoiceUri: string | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  speak(text: string): void {
    if (this.synth.speaking) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = this.getVoices();

    if (this.selectedVoiceUri) {
      const voice = voices.find((v) => v.voiceURI === this.selectedVoiceUri);
      if (voice) utterance.voice = voice;
    } else {
      // Sélection par défaut d'une voix chinoise (zh-CN de préférence)
      const defaultVoice =
        voices.find((v) => v.lang === 'zh-CN') ??
        voices.find((v) => v.lang.startsWith('zh')) ??
        null;
      if (defaultVoice) utterance.voice = defaultVoice;
    }

    utterance.rate = 0.8; // Un peu plus lent pour faciliter l'apprentissage
    this.synth.speak(utterance);
  }

  getVoices(): SpeechSynthesisVoice[] {
    // Note: getVoices() peut être vide au premier appel selon les navigateurs
    return this.synth.getVoices().filter((v) => v.lang.startsWith('zh'));
  }

  setVoice(voiceUri: string): void {
    this.selectedVoiceUri = voiceUri;
  }

  onVoicesChanged(callback: (voices: SpeechSynthesisVoice[]) => void): () => void {
    const handler = () => {
      callback(this.getVoices());
    };
    this.synth.addEventListener('voiceschanged', handler);
    return () => {
      this.synth.removeEventListener('voiceschanged', handler);
    };
  }
}
