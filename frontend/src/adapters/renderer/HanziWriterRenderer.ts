import HanziWriter, {
  type CharacterJson,
  type CharDataLoaderFn,
  type HanziWriterOptions,
  type Point,
  type QuizOptions,
  type RenderTargetInitFunction,
} from 'hanzi-writer';
import type {
  CharacterRenderer,
  StrokeAttempt,
  StrokeValidationResult,
} from '../../domain/ports/CharacterRenderer';

type CharacterDataLoader = (hanzi: string) => CharacterJson | Promise<CharacterJson>;

type HanziWriterInternalQuiz = {
  _currentStrokeIndex: number;
  startUserStroke(point: Point): unknown;
  continueUserStroke(point: Point): unknown;
  endUserStroke(): void;
};

type HanziWriterWithQuiz = HanziWriter & {
  _quiz?: HanziWriterInternalQuiz;
};

/**
 * Carte hanzi → données de tracé Hanzi Writer, restreinte aux caractères HSK.
 *
 * Générée hors-ligne par `make build-data`, un fichier par niveau
 * (`hsk1-stroke-data.generated.json`, `hsk2-stroke-data.generated.json`, …),
 * cf. RFC 0008 et RFC 0012. On charge ces fichiers en import dynamique paresseux
 * et on les fusionne, plutôt que de globber les ~9 600 JSON de `hanzi-writer-data` :
 * des chunks séparés précachés par le service worker. Ajouter HSK 3 = ajouter son
 * import ici.
 */
type BundledStrokeDataMap = Record<string, CharacterJson>;

let bundledStrokeDataPromise: Promise<BundledStrokeDataMap> | null = null;

function loadBundledStrokeDataMap(): Promise<BundledStrokeDataMap> {
  if (!bundledStrokeDataPromise) {
    bundledStrokeDataPromise = Promise.all([
      import('../../data/hsk1-stroke-data.generated.json'),
      import('../../data/hsk2-stroke-data.generated.json'),
    ]).then(
      (modules) => Object.assign({}, ...modules.map((m) => m.default)) as BundledStrokeDataMap,
    );
  }
  return bundledStrokeDataPromise;
}

export class HanziWriterRendererError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HanziWriterRendererError';
  }
}

export interface HanziWriterRendererOptions {
  width?: number;
  height?: number;
  padding?: number;
  showOutline?: boolean;
  showCharacter?: boolean;
  leniency?: number;
  characterDataLoader?: CharacterDataLoader;
}

export async function loadBundledHanziWriterData(hanzi: string): Promise<CharacterJson> {
  const map = await loadBundledStrokeDataMap();
  const data = map[hanzi];
  if (!data) {
    throw new HanziWriterRendererError(`données Hanzi Writer introuvables pour "${hanzi}"`);
  }
  return data;
}

export class HanziWriterRenderer implements CharacterRenderer {
  private writer: HanziWriterWithQuiz | null = null;
  private container: HTMLElement | null = null;
  private lastValidation: StrokeValidationResult | null = null;
  private completeCallbacks = new Set<() => void>();

  constructor(private readonly options: HanziWriterRendererOptions = {}) {}

  setOnComplete(callback: () => void): () => void {
    this.completeCallbacks.add(callback);
    return () => {
      this.completeCallbacks.delete(callback);
    };
  }

  async mount(container: HTMLElement, hanzi: string): Promise<void> {
    this.unmount();
    this.container = container;

    const writer = new HanziWriter(container, this.buildWriterOptions());
    this.writer = writer as HanziWriterWithQuiz;
    await writer.setCharacter(hanzi);
    await writer.quiz(this.buildQuizOptions());
  }

  unmount(): void {
    this.writer?.cancelQuiz();
    this.writer = null;
    this.lastValidation = null;
    this.container?.replaceChildren();
    this.container = null;
  }

  validateStroke(attempt: StrokeAttempt): StrokeValidationResult {
    const quiz = this.currentQuiz();
    const expectedStrokeIndex = quiz._currentStrokeIndex;

    if (attempt.points.length < 2) {
      return { expectedStrokeIndex, accepted: false, reason: 'too_short' };
    }

    this.lastValidation = null;
    const firstPoint = attempt.points[0];
    if (!firstPoint) {
      return { expectedStrokeIndex, accepted: false, reason: 'too_short' };
    }
    const remainingPoints = attempt.points.slice(1);
    quiz.startUserStroke(firstPoint);
    for (const point of remainingPoints) {
      quiz.continueUserStroke(point);
    }
    quiz.endUserStroke();

    return (
      this.lastValidation ?? {
        expectedStrokeIndex,
        accepted: false,
        reason: 'wrong_stroke',
      }
    );
  }

  reset(): void {
    const writer = this.writer;
    if (!writer) return;
    writer.cancelQuiz();
    this.lastValidation = null;
    void writer.quiz(this.buildQuizOptions());
  }

  showOutline(): void {
    void this.writer?.showOutline();
  }

  hideOutline(): void {
    void this.writer?.hideOutline();
  }

  showCharacter(): void {
    void this.writer?.showCharacter();
  }

  hideCharacter(): void {
    void this.writer?.hideCharacter();
  }

  private currentQuiz(): HanziWriterInternalQuiz {
    const quiz = this.writer?._quiz;
    if (!quiz) {
      throw new HanziWriterRendererError('Hanzi Writer n’est pas monté ou le quiz n’est pas prêt');
    }
    return quiz;
  }

  private buildWriterOptions(): Partial<HanziWriterOptions> {
    const width = this.options.width ?? 320;
    const height = this.options.height ?? width;
    return {
      width,
      height,
      padding: this.options.padding ?? 16,
      renderer: 'svg',
      showOutline: this.options.showOutline ?? true,
      showCharacter: this.options.showCharacter ?? false,
      strokeColor: '#111111',
      radicalColor: '#111111',
      outlineColor: '#888888',
      highlightColor: '#111111',
      drawingColor: '#111111',
      strokeFadeDuration: 0,
      drawingFadeDuration: 0,
      delayBetweenStrokes: 0,
      delayBetweenLoops: 0,
      highlightOnComplete: false,
      showHintAfterMisses: false,
      leniency: this.options.leniency ?? 1,
      charDataLoader: this.charDataLoader(),
      rendererOverride: {
        createRenderTarget: createPointerlessSvgRenderTarget as unknown as RenderTargetInitFunction<
          HTMLElement | SVGElement
        >,
      },
    };
  }

  private buildQuizOptions(): Partial<QuizOptions> {
    return {
      leniency: this.options.leniency ?? 1,
      showHintAfterMisses: false,
      highlightOnComplete: false,
      onCorrectStroke: (stroke) => {
        this.lastValidation = {
          expectedStrokeIndex: stroke.strokeNum,
          accepted: true,
        };
      },
      onMistake: (stroke) => {
        this.lastValidation = {
          expectedStrokeIndex: stroke.strokeNum,
          accepted: false,
          reason: stroke.isBackwards ? 'wrong_direction' : 'wrong_stroke',
        };
      },
      onComplete: () => {
        for (const callback of this.completeCallbacks) {
          try {
            callback();
          } catch (error) {
            console.error('onComplete callback error:', error);
          }
        }
      },
    };
  }

  private charDataLoader(): CharDataLoaderFn {
    const load = this.options.characterDataLoader ?? loadBundledHanziWriterData;
    return (hanzi) => load(hanzi);
  }
}

type PointerlessSvgRenderTarget = {
  node: SVGElement;
  svg: SVGElement;
  defs: SVGDefsElement;
  addPointerStartListener(callback: (event: unknown) => void): void;
  addPointerMoveListener(callback: (event: unknown) => void): void;
  addPointerEndListener(callback: () => void): void;
  getBoundingClientRect(): DOMRect;
  updateDimensions(width: string | number, height: string | number): void;
  createSubRenderTarget(): PointerlessSvgRenderTarget;
};

function createPointerlessSvgRenderTarget(
  elementOrId: string | HTMLElement | SVGElement,
  width: string | number | null = '100%',
  height: string | number | null = '100%',
): PointerlessSvgRenderTarget {
  const element =
    typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) {
    throw new HanziWriterRendererError(`conteneur Hanzi Writer introuvable : ${elementOrId}`);
  }

  const svg =
    element.nodeName.toUpperCase() === 'SVG' || element.nodeName.toUpperCase() === 'G'
      ? (element as SVGElement)
      : createSvgElement('svg');
  if (svg !== element) {
    element.appendChild(svg);
  }
  if (width !== null) svg.setAttribute('width', String(width));
  if (height !== null) svg.setAttribute('height', String(height));

  const defs = createSvgElement('defs') as SVGDefsElement;
  svg.appendChild(defs);
  return new PointerlessSvgRenderTargetImpl(svg, defs);
}

class PointerlessSvgRenderTargetImpl implements PointerlessSvgRenderTarget {
  readonly node: SVGElement;

  constructor(
    readonly svg: SVGElement,
    readonly defs: SVGDefsElement,
  ) {
    this.node = svg;
  }

  addPointerStartListener(_callback: (event: unknown) => void): void {
    // Input is handled by the Canvas feature via Pointer Events.
  }

  addPointerMoveListener(_callback: (event: unknown) => void): void {
    // Input is handled by the Canvas feature via Pointer Events.
  }

  addPointerEndListener(_callback: () => void): void {
    // Input is handled by the Canvas feature via Pointer Events.
  }

  getBoundingClientRect(): DOMRect {
    return this.node.getBoundingClientRect();
  }

  updateDimensions(width: string | number, height: string | number): void {
    this.node.setAttribute('width', String(width));
    this.node.setAttribute('height', String(height));
  }

  createSubRenderTarget(): PointerlessSvgRenderTarget {
    const group = createSvgElement('g');
    this.svg.appendChild(group);
    return new PointerlessSvgRenderTargetImpl(group, this.defs);
  }
}

function createSvgElement(name: string): SVGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', name);
}
