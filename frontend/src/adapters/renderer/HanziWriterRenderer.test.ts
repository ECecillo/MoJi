import type { CharacterJson, HanziWriterOptions } from 'hanzi-writer';

const hanziWriterMock = vi.hoisted(() => {
  type MockPoint = { x: number; y: number };
  type MockQuizOptions = {
    onCorrectStroke?: (stroke: {
      character: string;
      drawnPath: { pathString: string; points: MockPoint[] };
      isBackwards: boolean;
      strokeNum: number;
      mistakesOnStroke: number;
      totalMistakes: number;
      strokesRemaining: number;
    }) => void;
    onMistake?: (stroke: {
      character: string;
      drawnPath: { pathString: string; points: MockPoint[] };
      isBackwards: boolean;
      strokeNum: number;
      mistakesOnStroke: number;
      totalMistakes: number;
      strokesRemaining: number;
    }) => void;
  };

  class MockQuiz {
    _currentStrokeIndex = 0;
    points: MockPoint[] = [];

    constructor(
      private readonly owner: MockHanziWriter,
      private readonly options: MockQuizOptions,
    ) {}

    startUserStroke = vi.fn((point: MockPoint) => {
      this.points = [point];
    });

    continueUserStroke = vi.fn((point: MockPoint) => {
      this.points.push(point);
    });

    endUserStroke = vi.fn(() => {
      const stroke = {
        character: this.owner.character ?? '',
        drawnPath: { pathString: '', points: this.points },
        isBackwards: this.owner.nextStrokeIsBackwards,
        strokeNum: this._currentStrokeIndex,
        mistakesOnStroke: 0,
        totalMistakes: 0,
        strokesRemaining: 1,
      };
      if (this.owner.nextStrokeAccepted) {
        this.options.onCorrectStroke?.(stroke);
        this._currentStrokeIndex += 1;
      } else {
        this.options.onMistake?.(stroke);
      }
    });
  }

  class MockHanziWriter {
    static instances: MockHanziWriter[] = [];

    readonly target: unknown;
    character: string | null = null;
    nextStrokeAccepted = true;
    nextStrokeIsBackwards = false;
    _quiz: MockQuiz | undefined;

    constructor(
      readonly element: HTMLElement,
      readonly options: {
        width?: number;
        height?: number;
        rendererOverride?: {
          createRenderTarget?: (
            element: HTMLElement,
            width?: string | number | null,
            height?: string | number | null,
          ) => {
            addPointerStartListener(callback: (event: unknown) => void): void;
            addPointerMoveListener(callback: (event: unknown) => void): void;
            addPointerEndListener(callback: () => void): void;
          };
        };
      },
    ) {
      MockHanziWriter.instances.push(this);
      this.target = options.rendererOverride?.createRenderTarget?.(
        element,
        options.width,
        options.height,
      );
      if (this.target && typeof this.target === 'object') {
        const target = this.target as {
          addPointerStartListener(callback: (event: unknown) => void): void;
          addPointerMoveListener(callback: (event: unknown) => void): void;
          addPointerEndListener(callback: () => void): void;
        };
        target.addPointerStartListener(() => undefined);
        target.addPointerMoveListener(() => undefined);
        target.addPointerEndListener(() => undefined);
      }
    }

    setCharacter = vi.fn(async (character: string) => {
      this.character = character;
    });

    quiz = vi.fn(async (options: MockQuizOptions) => {
      this._quiz = new MockQuiz(this, options);
    });

    cancelQuiz = vi.fn(() => {
      this._quiz = undefined;
    });

    showOutline = vi.fn();
    hideOutline = vi.fn();
    showCharacter = vi.fn();
    hideCharacter = vi.fn();
  }

  return { MockHanziWriter };
});

vi.mock('hanzi-writer', () => ({ default: hanziWriterMock.MockHanziWriter }));

import {
  HanziWriterRenderer,
  HanziWriterRendererError,
  loadBundledHanziWriterData,
} from './HanziWriterRenderer';

const characterData: CharacterJson = {
  strokes: ['M 0 0 L 10 10'],
  medians: [
    [
      [0, 0],
      [10, 10],
    ],
  ],
};

function mountedInstance() {
  const instance = hanziWriterMock.MockHanziWriter.instances.at(-1);
  if (!instance) throw new Error('MockHanziWriter non monté');
  return instance;
}

describe('HanziWriterRenderer', () => {
  beforeEach(() => {
    hanziWriterMock.MockHanziWriter.instances = [];
  });

  it('monte Hanzi Writer avec des options e-ink et un loader de données injecté', async () => {
    const load = vi.fn(async () => characterData);
    const container = document.createElement('div');
    const renderer = new HanziWriterRenderer({
      width: 256,
      padding: 24,
      characterDataLoader: load,
    });

    await renderer.mount(container, '你');

    const instance = mountedInstance();
    const options = instance.options as Partial<HanziWriterOptions>;
    expect(instance.setCharacter).toHaveBeenCalledWith('你');
    expect(instance.quiz).toHaveBeenCalledTimes(1);
    expect(options.width).toBe(256);
    expect(options.height).toBe(256);
    expect(options.padding).toBe(24);
    expect(options.showOutline).toBe(true);
    expect(options.showCharacter).toBe(false);
    expect(options.strokeFadeDuration).toBe(0);
    expect(options.drawingFadeDuration).toBe(0);
    await expect(options.charDataLoader?.('你', vi.fn(), vi.fn())).resolves.toBe(characterData);
    expect(load).toHaveBeenCalledWith('你');
  });

  it('neutralise les listeners mouse/touch de Hanzi Writer', async () => {
    const container = document.createElement('div');
    const containerAddEventListener = vi.spyOn(container, 'addEventListener');
    const documentAddEventListener = vi.spyOn(document, 'addEventListener');
    const renderer = new HanziWriterRenderer({ characterDataLoader: () => characterData });

    await renderer.mount(container, '你');

    expect(container.querySelector('svg')).not.toBeNull();
    const containerEvents = containerAddEventListener.mock.calls.map(([eventName]) => eventName);
    const documentEvents = documentAddEventListener.mock.calls.map(([eventName]) => eventName);
    expect(containerEvents).not.toContain('mousedown');
    expect(containerEvents).not.toContain('touchstart');
    expect(containerEvents).not.toContain('mousemove');
    expect(containerEvents).not.toContain('touchmove');
    expect(documentEvents).not.toContain('mouseup');
    expect(documentEvents).not.toContain('touchend');
  });

  it('soumet les points capturés au quiz Hanzi Writer et retourne un trait accepté', async () => {
    const renderer = new HanziWriterRenderer({ characterDataLoader: () => characterData });
    await renderer.mount(document.createElement('div'), '你');
    const instance = mountedInstance();

    const result = renderer.validateStroke({
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 },
      ],
    });

    expect(result).toEqual({ expectedStrokeIndex: 0, accepted: true });
    expect(instance._quiz?.startUserStroke).toHaveBeenCalledWith({ x: 1, y: 2 });
    expect(instance._quiz?.continueUserStroke).toHaveBeenCalledTimes(2);
    expect(instance._quiz?.endUserStroke).toHaveBeenCalledTimes(1);
  });

  it('mappe un trait inversé vers wrong_direction', async () => {
    const renderer = new HanziWriterRenderer({ characterDataLoader: () => characterData });
    await renderer.mount(document.createElement('div'), '你');
    const instance = mountedInstance();
    instance.nextStrokeAccepted = false;
    instance.nextStrokeIsBackwards = true;

    const result = renderer.validateStroke({
      points: [
        { x: 3, y: 4 },
        { x: 1, y: 2 },
      ],
    });

    expect(result).toEqual({
      expectedStrokeIndex: 0,
      accepted: false,
      reason: 'wrong_direction',
    });
  });

  it('rejette un trait trop court sans le soumettre à Hanzi Writer', async () => {
    const renderer = new HanziWriterRenderer({ characterDataLoader: () => characterData });
    await renderer.mount(document.createElement('div'), '你');
    const instance = mountedInstance();

    const result = renderer.validateStroke({ points: [{ x: 1, y: 2 }] });

    expect(result).toEqual({
      expectedStrokeIndex: 0,
      accepted: false,
      reason: 'too_short',
    });
    expect(instance._quiz?.startUserStroke).not.toHaveBeenCalled();
  });

  it('reset redémarre le quiz sans recréer le writer', async () => {
    const renderer = new HanziWriterRenderer({ characterDataLoader: () => characterData });
    await renderer.mount(document.createElement('div'), '你');
    const instance = mountedInstance();

    renderer.reset();

    expect(instance.cancelQuiz).toHaveBeenCalledTimes(1);
    expect(instance.quiz).toHaveBeenCalledTimes(2);
    expect(hanziWriterMock.MockHanziWriter.instances).toHaveLength(1);
  });

  it('unmount annule le quiz et nettoie le conteneur', async () => {
    const container = document.createElement('div');
    const renderer = new HanziWriterRenderer({ characterDataLoader: () => characterData });
    await renderer.mount(container, '你');
    const instance = mountedInstance();

    renderer.unmount();

    expect(instance.cancelQuiz).toHaveBeenCalledTimes(1);
    expect(container.childElementCount).toBe(0);
    expect(() =>
      renderer.validateStroke({
        points: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
      }),
    ).toThrow(HanziWriterRendererError);
  });

  it('pilote la visibilité du modèle et du caractère', async () => {
    const renderer = new HanziWriterRenderer({ characterDataLoader: () => characterData });
    await renderer.mount(document.createElement('div'), '你');
    const instance = mountedInstance();

    renderer.showOutline();
    expect(instance.showOutline).toHaveBeenCalled();

    renderer.hideOutline();
    expect(instance.hideOutline).toHaveBeenCalled();

    renderer.showCharacter();
    expect(instance.showCharacter).toHaveBeenCalled();

    renderer.hideCharacter();
    expect(instance.hideCharacter).toHaveBeenCalled();
  });

  it('charge les données Hanzi Writer bundlées depuis hanzi-writer-data', async () => {
    const data = await loadBundledHanziWriterData('你');

    expect(data.strokes.length).toBeGreaterThan(0);
    expect(data.medians.length).toBe(data.strokes.length);
  });
});
