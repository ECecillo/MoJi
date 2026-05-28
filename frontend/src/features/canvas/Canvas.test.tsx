import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { Canvas, type CapturedStrokeAttempt } from './Canvas';
import type {
  CharacterRenderer,
  StrokeAttempt,
  StrokeValidationResult,
} from '../../domain/ports/CharacterRenderer';
import i18n from '../../i18n';

class FakeRenderer implements CharacterRenderer {
  mount = vi.fn(async (_container: HTMLElement, _hanzi: string) => undefined);
  unmount = vi.fn();
  validateStroke = vi.fn(
    (_attempt: StrokeAttempt): StrokeValidationResult => ({
      expectedStrokeIndex: 0,
      accepted: true,
    }),
  );
  reset = vi.fn();
  showOutline = vi.fn();
  hideOutline = vi.fn();
  showCharacter = vi.fn();
  hideCharacter = vi.fn();
}

function inputLayer() {
  return screen.getByRole('application', { name: /zone de saisie stylet/i });
}

function withRect(element: Element, rect: Partial<DOMRect>) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: rect.x ?? 0,
    y: rect.y ?? 0,
    left: rect.left ?? 0,
    top: rect.top ?? 0,
    right: rect.right ?? 0,
    bottom: rect.bottom ?? 0,
    width: rect.width ?? 320,
    height: rect.height ?? 320,
    toJSON: () => ({}),
  } as DOMRect);
}

function dispatchPointer(
  element: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: {
    pointerId: number;
    pointerType?: string;
    isPrimary?: boolean;
    clientX?: number;
    clientY?: number;
    pressure?: number;
    tiltX?: number;
    tiltY?: number;
  },
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
  });
  Object.defineProperties(event, {
    pointerId: { value: init.pointerId },
    pointerType: { value: init.pointerType ?? 'pen' },
    isPrimary: { value: init.isPrimary ?? true },
    pressure: { value: init.pressure ?? 0 },
    tiltX: { value: init.tiltX ?? 0 },
    tiltY: { value: init.tiltY ?? 0 },
  });
  fireEvent(element, event);
}

describe('Canvas', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('fr');
  });

  it('monte et démonte le CharacterRenderer pour le hanzi courant', () => {
    const renderer = new FakeRenderer();
    const { unmount } = render(<Canvas hanzi="你" renderer={renderer} />);

    expect(renderer.mount).toHaveBeenCalledTimes(1);
    expect(renderer.mount.mock.calls[0]?.[0]).toBeInstanceOf(HTMLElement);
    expect(renderer.mount.mock.calls[0]?.[1]).toBe('你');

    unmount();
    expect(renderer.unmount).toHaveBeenCalledTimes(1);
  });

  it('capture points, pression et inclinaison puis valide au pointerup', () => {
    const renderer = new FakeRenderer();
    const onStrokeValidated = vi.fn();
    render(
      <Canvas hanzi="你" renderer={renderer} size={200} onStrokeValidated={onStrokeValidated} />,
    );
    const layer = inputLayer();
    withRect(layer, { left: 10, top: 20 });

    dispatchPointer(layer, 'pointerdown', {
      pointerId: 7,
      pointerType: 'pen',
      isPrimary: true,
      clientX: 20,
      clientY: 40,
      pressure: 0.25,
      tiltX: 12,
      tiltY: -4,
    });
    dispatchPointer(layer, 'pointermove', {
      pointerId: 7,
      pointerType: 'pen',
      clientX: 30,
      clientY: 50,
      pressure: 0.5,
      tiltX: 10,
      tiltY: -2,
    });
    dispatchPointer(layer, 'pointerup', {
      pointerId: 7,
      pointerType: 'pen',
      clientX: 40,
      clientY: 60,
      pressure: 0,
      tiltX: 8,
      tiltY: 0,
    });

    expect(renderer.validateStroke).toHaveBeenCalledTimes(1);
    expect(renderer.validateStroke).toHaveBeenCalledWith({
      points: [
        { x: 10, y: 20 },
        { x: 20, y: 30 },
        { x: 30, y: 40 },
      ],
      pressures: [0.25, 0.5, 0],
      tilts: [
        { x: 12, y: -4 },
        { x: 10, y: -2 },
        { x: 8, y: 0 },
      ],
      pointerType: 'pen',
    } satisfies CapturedStrokeAttempt);
    expect(onStrokeValidated).toHaveBeenCalledWith(
      { expectedStrokeIndex: 0, accepted: true },
      expect.objectContaining({ pointerType: 'pen' }),
    );
  });

  it('dessine le trait validé en noir quand il est accepté', () => {
    const renderer = new FakeRenderer();
    render(<Canvas hanzi="你" renderer={renderer} />);
    const layer = inputLayer();

    dispatchPointer(layer, 'pointerdown', {
      pointerId: 1,
      pointerType: 'pen',
      isPrimary: true,
      clientX: 1,
      clientY: 2,
    });
    dispatchPointer(layer, 'pointerup', {
      pointerId: 1,
      pointerType: 'pen',
      clientX: 3,
      clientY: 4,
    });

    const stroke = document.querySelector('polyline');
    expect(stroke).toHaveAttribute('points', '1,2 3,4');
    expect(stroke).toHaveAttribute('stroke', '#111111');
  });

  it('dessine un trait refusé en gris', () => {
    const renderer = new FakeRenderer();
    renderer.validateStroke.mockReturnValue({
      expectedStrokeIndex: 0,
      accepted: false,
      reason: 'wrong_direction',
    });
    render(<Canvas hanzi="你" renderer={renderer} />);
    const layer = inputLayer();

    dispatchPointer(layer, 'pointerdown', {
      pointerId: 1,
      pointerType: 'pen',
      isPrimary: true,
      clientX: 1,
      clientY: 2,
    });
    dispatchPointer(layer, 'pointerup', {
      pointerId: 1,
      pointerType: 'pen',
      clientX: 3,
      clientY: 4,
    });

    expect(document.querySelector('polyline')).toHaveAttribute('stroke', '#888888');
  });

  it('annule un trait sur pointercancel sans appeler validateStroke', () => {
    const renderer = new FakeRenderer();
    render(<Canvas hanzi="你" renderer={renderer} />);
    const layer = inputLayer();

    dispatchPointer(layer, 'pointerdown', {
      pointerId: 9,
      pointerType: 'pen',
      isPrimary: true,
      clientX: 1,
      clientY: 2,
    });
    dispatchPointer(layer, 'pointercancel', {
      pointerId: 9,
      pointerType: 'pen',
    });

    expect(renderer.validateStroke).not.toHaveBeenCalled();
    expect(document.querySelector('polyline')).toBeNull();
  });

  it('ignore les pointeurs non primaires', () => {
    const renderer = new FakeRenderer();
    render(<Canvas hanzi="你" renderer={renderer} />);
    const layer = inputLayer();

    dispatchPointer(layer, 'pointerdown', {
      pointerId: 2,
      pointerType: 'pen',
      isPrimary: false,
      clientX: 1,
      clientY: 2,
    });
    dispatchPointer(layer, 'pointerup', {
      pointerId: 2,
      pointerType: 'pen',
      clientX: 3,
      clientY: 4,
    });

    expect(renderer.validateStroke).not.toHaveBeenCalled();
  });

  it('affiche la grille demandée', () => {
    const renderer = new FakeRenderer();
    const { container } = render(<Canvas hanzi="你" renderer={renderer} gridType="mi" />);

    // Mi Zi Ge has vertical, horizontal and 2 diagonals = 4 lines
    const lines = container.querySelectorAll('line');
    expect(lines).toHaveLength(4);
  });

  it('pilote la visibilité du renderer une fois le mount terminé', async () => {
    const renderer = new FakeRenderer();
    render(<Canvas hanzi="你" renderer={renderer} showOutline={true} showCharacter={false} />);

    await waitFor(() => {
      expect(renderer.showOutline).toHaveBeenCalled();
      expect(renderer.hideCharacter).toHaveBeenCalled();
    });
  });

  it('ne remonte pas Hanzi Writer quand showOutline change (préserve le quiz)', async () => {
    const renderer = new FakeRenderer();
    const { rerender } = render(<Canvas hanzi="你" renderer={renderer} showOutline={true} />);
    await waitFor(() => expect(renderer.showOutline).toHaveBeenCalled());
    expect(renderer.mount).toHaveBeenCalledTimes(1);

    rerender(<Canvas hanzi="你" renderer={renderer} showOutline={false} />);
    await waitFor(() => expect(renderer.hideOutline).toHaveBeenCalled());

    // Critique : le mount ne doit PAS avoir été rappelé. Sinon le quiz se
    // remet à zéro et les traits déjà validés disparaissent côté Hanzi Writer.
    expect(renderer.mount).toHaveBeenCalledTimes(1);
    expect(renderer.unmount).not.toHaveBeenCalled();
  });

  it('reset les traits user quand le hanzi change', () => {
    const renderer = new FakeRenderer();
    const { rerender } = render(<Canvas hanzi="你" renderer={renderer} />);
    const layer = inputLayer();

    dispatchPointer(layer, 'pointerdown', {
      pointerId: 1,
      pointerType: 'pen',
      isPrimary: true,
      clientX: 1,
      clientY: 2,
    });
    dispatchPointer(layer, 'pointerup', {
      pointerId: 1,
      pointerType: 'pen',
      clientX: 3,
      clientY: 4,
    });
    expect(document.querySelector('polyline')).not.toBeNull();

    rerender(<Canvas hanzi="好" renderer={renderer} />);
    expect(document.querySelector('polyline')).toBeNull();
  });

  it('affiche le compteur "0 trait validé" au montage', async () => {
    const renderer = new FakeRenderer();
    render(<Canvas hanzi="你" renderer={renderer} />);
    expect(screen.getByTestId('accepted-count')).toHaveTextContent('0 trait validé');
  });

  it('incrémente le compteur après chaque trait accepté', () => {
    const renderer = new FakeRenderer();
    render(<Canvas hanzi="你" renderer={renderer} />);
    const layer = inputLayer();

    for (let i = 0; i < 3; i++) {
      dispatchPointer(layer, 'pointerdown', {
        pointerId: i + 1,
        pointerType: 'pen',
        isPrimary: true,
        clientX: 1,
        clientY: 2,
      });
      dispatchPointer(layer, 'pointerup', {
        pointerId: i + 1,
        pointerType: 'pen',
        clientX: 3,
        clientY: 4,
      });
    }

    expect(screen.getByTestId('accepted-count')).toHaveTextContent('3 traits validés');
  });

  it('affiche le verdict accepté après un trait correct', () => {
    const renderer = new FakeRenderer();
    renderer.validateStroke.mockReturnValue({ expectedStrokeIndex: 2, accepted: true });
    render(<Canvas hanzi="你" renderer={renderer} />);
    const layer = inputLayer();

    dispatchPointer(layer, 'pointerdown', {
      pointerId: 1,
      pointerType: 'pen',
      isPrimary: true,
      clientX: 1,
      clientY: 2,
    });
    dispatchPointer(layer, 'pointerup', {
      pointerId: 1,
      pointerType: 'pen',
      clientX: 3,
      clientY: 4,
    });

    expect(screen.getByTestId('verdict-message')).toHaveTextContent('Trait 3 validé');
  });

  it('affiche un message explicite quand le trait est dans le mauvais sens', () => {
    const renderer = new FakeRenderer();
    renderer.validateStroke.mockReturnValue({
      expectedStrokeIndex: 0,
      accepted: false,
      reason: 'wrong_direction',
    });
    render(<Canvas hanzi="你" renderer={renderer} />);
    const layer = inputLayer();

    dispatchPointer(layer, 'pointerdown', {
      pointerId: 1,
      pointerType: 'pen',
      isPrimary: true,
      clientX: 1,
      clientY: 2,
    });
    dispatchPointer(layer, 'pointerup', {
      pointerId: 1,
      pointerType: 'pen',
      clientX: 3,
      clientY: 4,
    });

    expect(screen.getByTestId('verdict-message')).toHaveTextContent(/mauvais sens/i);
  });
});
