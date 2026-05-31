/**
 * Port définissant les capacités de synthèse vocale.
 */
export interface SpeechProvider {
  /**
   * Prononce le texte fourni.
   */
  speak(text: string): void;

  /**
   * Retourne la liste des voix disponibles filtrées pour le chinois.
   */
  getVoices(): SpeechSynthesisVoice[];

  /**
   * Définit la voix à utiliser via son URI unique.
   */
  setVoice(voiceUri: string): void;

  /**
   * S'abonne aux changements de disponibilité des voix (chargement asynchrone).
   * Retourne une fonction pour se désabonner.
   */
  onVoicesChanged(callback: (voices: SpeechSynthesisVoice[]) => void): () => void;
}
