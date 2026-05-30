/**
 * Heuristique pour détecter si un trait utilisateur ressemble à un autre déjà
 * réalisé. Utilisée par `Canvas` pour requalifier un trait refusé par Hanzi
 * Writer en "trait déjà tracé" quand l'utilisateur retrace par erreur un trait
 * déjà validé : le verdict redevient compréhensible (et non punitif).
 *
 * La fonction reste **pure** et géométrique — pas de couplage à Hanzi Writer.
 * Elle s'exécute sur les points capturés en pixels-écran (origine en haut à
 * gauche du canvas), et le seuil est exprimé relativement à la taille du
 * canvas pour rester indépendant de la résolution.
 */
export interface Point2D {
  x: number;
  y: number;
}

export interface SimilarStrokeOptions {
  /** Seuil de proximité (px) pour les points de début ET de fin. Si les deux
   *  endpoints sont sous ce seuil, on considère les traits comme similaires. */
  endpointToleranceInPx: number;
}

/** Retourne true si les deux traits ont des endpoints proches l'un de l'autre. */
export function strokesAreSimilar(
  a: ReadonlyArray<Point2D>,
  b: ReadonlyArray<Point2D>,
  options: SimilarStrokeOptions,
): boolean {
  const aStart = a[0];
  const aEnd = a[a.length - 1];
  const bStart = b[0];
  const bEnd = b[b.length - 1];
  if (!aStart || !aEnd || !bStart || !bEnd) return false;

  const startDistance = euclidean(aStart, bStart);
  const endDistance = euclidean(aEnd, bEnd);
  const threshold = options.endpointToleranceInPx;
  return startDistance <= threshold && endDistance <= threshold;
}

/** Helper : convertit un pourcentage de la taille du canvas en pixels. */
export function endpointToleranceFromCanvasSize(sizeInPx: number, ratio = 0.15): number {
  return sizeInPx * ratio;
}

function euclidean(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
