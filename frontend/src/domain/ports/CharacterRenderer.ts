/**
 * Port `CharacterRenderer` — encapsule le rendu d'un sinogramme et la validation
 * du tracé utilisateur (ordre + direction des traits).
 *
 * L'implémentation initiale s'appuie sur Hanzi Writer (cf. RFC 0002 et 0003) ;
 * elle vit dans `src/adapters/renderer/`. Le domaine ne doit jamais importer
 * directement la bibliothèque sous-jacente.
 */

export interface StrokeAttempt {
  /** Suite ordonnée de points (x, y) capturés via Pointer Events. */
  points: ReadonlyArray<{ x: number; y: number }>;
  /** Optionnel : pressions normalisées entre 0 et 1, alignées sur `points`. */
  pressures?: ReadonlyArray<number>;
}

export interface StrokeValidationResult {
  /** Indice du trait attendu (0-indexed) au moment de la tentative. */
  expectedStrokeIndex: number;
  /** True si le tracé est accepté (bon trait, bonne direction). */
  accepted: boolean;
  /** Si refusé, raison machine-readable destinée à l'UI. */
  reason?: 'wrong_stroke' | 'wrong_direction' | 'too_short' | 'out_of_bounds';
}

export interface CharacterRenderer {
  /** Affiche le sinogramme `hanzi` dans le conteneur fourni, prêt à être tracé. */
  mount(container: HTMLElement, hanzi: string): Promise<void>;

  /** Détache et nettoie le rendu courant. */
  unmount(): void;

  /** Soumet un trait utilisateur et retourne le verdict de validation. */
  validateStroke(attempt: StrokeAttempt): StrokeValidationResult;

  /** Réinitialise l'état d'avancement (par exemple sur "recommencer"). */
  reset(): void;
}
