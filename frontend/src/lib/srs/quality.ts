import type { SrsQuality } from './sm2';

/**
 * Mappe une session de tracé (nombre de refus authentiques) vers une quality
 * SM-2. Les traits "déjà tracés" (repeated_stroke) ne comptent PAS comme
 * refus — Canvas les requalifie côté UI avant de remonter cet input.
 *
 * Barème :
 *   0 refus  → 5 (parfait)
 *   1 refus  → 4 (correct avec hésitation)
 *   2 refus  → 3 (correct avec effort)
 *   3-4      → 2 (échec léger : retentera bientôt)
 *   5+       → 1 (échec marqué)
 *   abandon  → 0 (l'utilisateur n'a pas terminé le caractère)
 *
 * Le seuil 3/2 = "remembered/forgot" en SM-2. À 2 refus on garde succès
 * (interval continue de croître). À partir de 3 on bascule en échec
 * (interval réinitialisé).
 */
export interface ReviewSessionResult {
  /** Nombre de traits authentiquement refusés par Hanzi Writer (hors
   *  repeated_stroke synthétisé côté UI). */
  refusals: number;
  /** True si le caractère a été complété (tous les traits validés).
   *  Si false, la session est traitée comme un abandon → quality 0. */
  completed: boolean;
}

export function qualityFromSession(session: ReviewSessionResult): SrsQuality {
  if (!session.completed) return 0;
  if (session.refusals <= 0) return 5;
  if (session.refusals === 1) return 4;
  if (session.refusals === 2) return 3;
  if (session.refusals <= 4) return 2;
  return 1;
}
