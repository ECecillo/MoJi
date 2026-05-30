/**
 * Algorithme SuperMemo 2 (SM-2) — variante mono-utilisateur.
 *
 * Référence : Wozniak, P. A. (1990). Optimization of repetition spacing in the
 * practice of learning. Implémentation idiomatique condensée.
 *
 * Convention de quality (héritée de SM-2) :
 *   5 = parfait
 *   4 = correct avec hésitation
 *   3 = correct avec effort
 *   2 = échec mais réponse familière
 *   1 = échec, réponse difficile à se rappeler
 *   0 = échec total
 *
 * Si quality >= 3 → succès, l'intervalle croît.
 * Si quality < 3  → échec, l'intervalle est réinitialisé à 1 jour et l'ease
 *                   est diminué (mais jamais sous 1.3).
 *
 * Le composant Canvas/App mappe ses verdicts (refusals, repeats) vers une
 * quality via `qualityFromSession` (cf. `quality.ts`).
 *
 * La fonction est PURE : pas d'I/O, pas de Date.now(). Le `today` est
 * explicite pour permettre des tests déterministes.
 */

import type { SrsState } from '../../domain/ports/ProgressRepository';

export type SrsQuality = 0 | 1 | 2 | 3 | 4 | 5;

const MIN_EASE = 1.3;
const INITIAL_EASE = 2.5;

/**
 * Calcule le nouvel état SRS à partir de l'état précédent (ou null si jamais
 * vu) et de la qualité de la session.
 *
 * Règles :
 * - Premier rappel jamais vu (state=null) : interval=1 si succès, 0 si échec
 *   (immédiatement re-due aujourd'hui pour réessayer).
 * - Rappel ultérieur succès : interval *= ease, ease ajusté selon quality.
 * - Rappel ultérieur échec : interval=1, ease diminué.
 */
export function applyReview(state: SrsState | null, quality: SrsQuality, today: Date): SrsState {
  const success = quality >= 3;
  const previousEase = state?.ease ?? INITIAL_EASE;
  const newEase = computeNewEase(previousEase, quality);

  if (!success) {
    // Échec : reprogrammer pour aujourd'hui (re-due tout de suite), ease ↓.
    return {
      interval_days: 0,
      ease: newEase,
      due: formatIsoDate(today),
    };
  }

  const previousInterval = state?.interval_days ?? 0;
  const newInterval = computeNewInterval(previousInterval, newEase);
  return {
    interval_days: newInterval,
    ease: newEase,
    due: formatIsoDate(addDays(today, newInterval)),
  };
}

function computeNewEase(previousEase: number, quality: SrsQuality): number {
  // Formule SM-2 standard : EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
  const q = quality;
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  return Math.max(MIN_EASE, previousEase + delta);
}

function computeNewInterval(previousInterval: number, ease: number): number {
  if (previousInterval === 0) return 1; // premier succès → 1 jour
  if (previousInterval === 1) return 6; // deuxième succès → 6 jours (convention SM-2)
  return Math.round(previousInterval * ease);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Renvoie une date ISO 8601 sans heure (YYYY-MM-DD). On stocke des dates et
 * pas des timestamps : la révision SRS raisonne en jours pleins, pas en
 * heures, et ça évite les bagarres de fuseau horaire.
 */
function formatIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
