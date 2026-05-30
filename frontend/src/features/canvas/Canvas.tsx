import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CharacterRenderer,
  StrokeAttempt,
  StrokeValidationResult,
} from '../../domain/ports/CharacterRenderer';
import { CharacterGrid, type GridType } from '../../ui/CharacterGrid';
import { endpointToleranceFromCanvasSize, strokesAreSimilar } from '../../lib/strokeSimilarity';

export interface CapturedStrokeAttempt extends StrokeAttempt {
  tilts: ReadonlyArray<{ x: number; y: number }>;
  pointerType: string;
}

export interface CanvasProps {
  hanzi: string;
  renderer: CharacterRenderer;
  size?: number;
  gridType?: GridType;
  showOutline?: boolean;
  showCharacter?: boolean;
  className?: string;
  onStrokeValidated?: (result: StrokeValidationResult, attempt: CapturedStrokeAttempt) => void;
}

type CapturedPoint = {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
};

type ActiveStroke = {
  pointerId: number;
  pointerType: string;
  points: CapturedPoint[];
};

export function Canvas({
  hanzi,
  renderer,
  size = 320,
  gridType = 'tian',
  showOutline = true,
  showCharacter = false,
  className = '',
  onStrokeValidated,
}: CanvasProps) {
  const { t } = useTranslation();
  const rendererLayerRef = useRef<HTMLDivElement | null>(null);
  const inputLayerRef = useRef<HTMLDivElement | null>(null);
  const activeStrokeRef = useRef<ActiveStroke | null>(null);
  const [currentPoints, setCurrentPoints] = useState<ReadonlyArray<CapturedPoint>>([]);
  const [completedStrokes, setCompletedStrokes] = useState<
    ReadonlyArray<{ points: ReadonlyArray<CapturedPoint>; accepted: boolean }>
  >([]);
  const [verdict, setVerdict] = useState<StrokeValidationResult | null>(null);
  // Increment after Hanzi Writer is mounted to gate the visibility effects.
  // Keeps mount strictly tied to [hanzi, renderer] so toggling outline/character
  // doesn't tear down and recreate the writer (and lose its quiz progress).
  const [mountVersion, setMountVersion] = useState(0);

  useEffect(() => {
    const layer = rendererLayerRef.current;
    if (!layer) return;
    let cancelled = false;

    void renderer.mount(layer, hanzi).then(() => {
      // ⚠ Race StrictMode : la 1ʳᵉ mount() peut se résoudre APRÈS son cleanup.
      // Si on appelle renderer.unmount() ici, on clobber la 2ᵉ mount déjà en
      // cours qui partage la même instance de renderer. Le cleanup du
      // useEffect s'occupe déjà du démontage réel ; on se contente de NE PAS
      // signaler le mount comme prêt si on a été annulé entre-temps.
      if (cancelled) return;
      setMountVersion((v) => v + 1);
    });

    return () => {
      cancelled = true;
      renderer.unmount();
      setMountVersion(0);
    };
  }, [hanzi, renderer]);

  // Reset user-stroke state when the target character changes.
  useEffect(() => {
    setCompletedStrokes([]);
    setCurrentPoints([]);
    setVerdict(null);
  }, [hanzi]);

  // Sync outline visibility after mount completes and on subsequent toggles.
  useEffect(() => {
    if (mountVersion === 0) return;
    if (showOutline) renderer.showOutline();
    else renderer.hideOutline();
  }, [renderer, showOutline, mountVersion]);

  useEffect(() => {
    if (mountVersion === 0) return;
    if (showCharacter) renderer.showCharacter();
    else renderer.hideCharacter();
  }, [renderer, showCharacter, mountVersion]);

  const acceptedCount = useMemo(
    () => completedStrokes.filter((s) => s.accepted).length,
    [completedStrokes],
  );

  const startStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.isPrimary === false) return;
    const point = pointFromEvent(event);
    activeStrokeRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType || 'unknown',
      points: [point],
    };
    setCurrentPoints([point]);
    // setPointerCapture peut lever NotFoundError sur des PointerEvent
    // synthétiques (tests E2E, dispatchEvent). On l'absorbe : la capture
    // est un bonus pour suivre un pointeur qui sort du composant, pas
    // indispensable au flux de tracé.
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // ignored
    }
    event.preventDefault();
  };

  const continueStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = activeStrokeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const point = pointFromEvent(event);
    active.points = [...active.points, point];
    setCurrentPoints(active.points);
    event.preventDefault();
  };

  const finishStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = activeStrokeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;

    const finalPoint = pointFromEvent(event);
    if (!samePoint(active.points[active.points.length - 1], finalPoint)) {
      active.points = [...active.points, finalPoint];
    }

    const attempt = toAttempt(active);
    const rawResult = renderer.validateStroke(attempt);

    // Si Hanzi Writer refuse, on vérifie si le tracé ressemble géométriquement
    // à un trait déjà validé. Cas typique : l'utilisateur retrace par erreur
    // (ou exprès, pour s'entraîner) un trait qu'il vient de valider. On
    // requalifie alors le verdict en `repeated_stroke` pour ne pas confondre
    // l'utilisateur, et on n'ajoute PAS ce tracé à la liste affichée
    // (la polyline pâle du trait original suffit).
    const tolerance = endpointToleranceFromCanvasSize(size);
    const acceptedStrokes = completedStrokes.filter((s) => s.accepted);
    const isRepeat =
      !rawResult.accepted &&
      acceptedStrokes.some((s) =>
        strokesAreSimilar(s.points, active.points, { endpointToleranceInPx: tolerance }),
      );

    const result: StrokeValidationResult = isRepeat
      ? { ...rawResult, reason: 'repeated_stroke' }
      : rawResult;

    if (!isRepeat) {
      setCompletedStrokes((strokes) => [
        ...strokes,
        { points: active.points, accepted: result.accepted },
      ]);
    }
    setCurrentPoints([]);
    setVerdict(result);
    activeStrokeRef.current = null;
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // ignored (cf. note dans startStroke).
    }
    onStrokeValidated?.(result, attempt);
    event.preventDefault();
  };

  const undoLastStroke = () => {
    setCompletedStrokes((strokes) => {
      if (strokes.length === 0) return strokes;
      // On retire le dernier en date, qu'il soit accepté ou refusé. Un trait
      // accepté retiré ne ré-engage PAS le quiz côté Hanzi Writer (qui a déjà
      // avancé) — c'est volontaire : Annuler n'efface que l'affichage, pour
      // un reset complet utiliser "Tout effacer".
      return strokes.slice(0, -1);
    });
    setVerdict(null);
  };

  const resetAll = () => {
    renderer.reset();
    setCompletedStrokes([]);
    setCurrentPoints([]);
    setVerdict(null);
    activeStrokeRef.current = null;
  };

  const cancelStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = activeStrokeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    activeStrokeRef.current = null;
    setCurrentPoints([]);
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // ignored
    }
    event.preventDefault();
  };

  return (
    <section
      className={`flex flex-col items-center gap-3 text-ink ${className}`.trim()}
      aria-label={`Tracé du caractère ${hanzi}`}
    >
      <div
        className="relative shrink-0 border border-ink bg-paper"
        style={{ width: size, height: size }}
      >
        <CharacterGrid type={gridType} size={size} className="absolute inset-0" />
        <div ref={rendererLayerRef} className="absolute inset-0" aria-hidden="true" />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          {completedStrokes.map((stroke, index) => (
            <polyline
              key={index}
              points={toPolylinePoints(stroke.points)}
              fill="none"
              stroke={stroke.accepted ? '#111111' : '#888888'}
              strokeOpacity={stroke.accepted ? 0.3 : 0.85}
              strokeWidth={stroke.accepted ? 2 : 4}
              strokeDasharray={stroke.accepted ? undefined : '6 4'}
              strokeLinecap="round"
              strokeLinejoin="round"
              data-testid={stroke.accepted ? 'stroke-accepted' : 'stroke-refused'}
            />
          ))}
          {currentPoints.length > 0 ? (
            <polyline
              points={toPolylinePoints(currentPoints)}
              fill="none"
              stroke="#111111"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </svg>
        <div
          ref={inputLayerRef}
          className="absolute inset-0 touch-none"
          role="application"
          tabIndex={0}
          aria-label={`Zone de saisie stylet pour ${hanzi}`}
          data-renderer-mounted={mountVersion > 0 ? 'true' : 'false'}
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={finishStroke}
          onPointerCancel={cancelStroke}
        />
      </div>

      <div
        className="flex flex-col items-center gap-1 text-sm"
        data-testid="canvas-feedback"
        aria-live="polite"
      >
        <p className="text-ink-muted" data-testid="accepted-count">
          {t('canvas.stroke_count', { count: acceptedCount })}
        </p>
        {verdict !== null ? (
          <p
            data-testid="verdict-message"
            className={verdict.accepted ? 'text-ink' : 'text-ink-muted italic'}
          >
            {verdict.accepted
              ? t('canvas.verdict_accepted', { stroke: verdict.expectedStrokeIndex + 1 })
              : t(`canvas.verdict_refused.${verdict.reason ?? 'default'}`)}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={undoLastStroke}
          disabled={completedStrokes.length === 0}
          className="border border-ink px-3 py-1 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="undo-last"
        >
          {t('canvas.undo_last')}
        </button>
        <button
          type="button"
          onClick={resetAll}
          disabled={completedStrokes.length === 0 && verdict === null}
          className="border border-ink px-3 py-1 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="reset-all"
        >
          {t('canvas.reset_all')}
        </button>
      </div>
    </section>
  );
}

function pointFromEvent(event: ReactPointerEvent<HTMLElement>): CapturedPoint {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    pressure: normalizePressure(event.pressure),
    tiltX: event.tiltX ?? 0,
    tiltY: event.tiltY ?? 0,
  };
}

function normalizePressure(pressure: number): number {
  if (typeof pressure !== 'number' || Number.isNaN(pressure)) return 0;
  return Math.min(1, Math.max(0, pressure));
}

function samePoint(a: CapturedPoint | undefined, b: CapturedPoint): boolean {
  return Boolean(a && a.x === b.x && a.y === b.y);
}

function toAttempt(stroke: ActiveStroke): CapturedStrokeAttempt {
  return {
    points: stroke.points.map(({ x, y }) => ({ x, y })),
    pressures: stroke.points.map(({ pressure }) => pressure),
    tilts: stroke.points.map(({ tiltX, tiltY }) => ({ x: tiltX, y: tiltY })),
    pointerType: stroke.pointerType,
  };
}

function toPolylinePoints(points: ReadonlyArray<{ x: number; y: number }>): string {
  return points.map(({ x, y }) => `${x},${y}`).join(' ');
}
