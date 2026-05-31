import type { SpeechProvider } from '../../domain/ports/SpeechProvider';

export class WebSpeechProvider implements SpeechProvider {
  private readonly synth: SpeechSynthesis | null;
  private selectedVoiceUri: string | null = null;

  constructor() {
    this.synth =
      typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  }

  speak(text: string): void {
    if (!this.synth || typeof SpeechSynthesisUtterance === 'undefined') {
      return;
    }

    if (this.synth.speaking) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = this.getVoices();
    const voice = this.selectVoice(voices);

    if (voice) utterance.voice = voice;

    utterance.rate = 0.8; // Un peu plus lent pour faciliter l'apprentissage
    this.synth.speak(utterance);
  }

  getVoices(): SpeechSynthesisVoice[] {
    // Note: getVoices() peut être vide au premier appel selon les navigateurs
    return this.synth?.getVoices().filter((v) => v.lang.startsWith('zh')) ?? [];
  }

  setVoice(voiceUri: string | null): void {
    const normalized = voiceUri?.trim() ?? '';
    this.selectedVoiceUri = normalized.length > 0 ? normalized : null;
  }

  onVoicesChanged(callback: (voices: SpeechSynthesisVoice[]) => void): () => void {
    const synth = this.synth;
    if (!synth) {
      return () => undefined;
    }

    const handler = () => {
      callback(this.getVoices());
    };
    synth.addEventListener('voiceschanged', handler);
    return () => {
      synth.removeEventListener('voiceschanged', handler);
    };
  }

  private selectVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (this.selectedVoiceUri) {
      const selectedVoice = voices.find((v) => v.voiceURI === this.selectedVoiceUri);
      if (selectedVoice) return selectedVoice;
    }

    // Sélection par défaut d'une voix chinoise (zh-CN de préférence)
    return (
      voices.find((v) => v.lang === 'zh-CN') ?? voices.find((v) => v.lang.startsWith('zh')) ?? null
    );
  }
}
