import { expect, test } from '@playwright/test';

import type { Locator } from '@playwright/test';

/**
 * Tests E2E du canvas de tracé. On simule une séquence Pointer Events
 * (down → move → up) et on vérifie que la chaîne `pointer → validateStroke
 * → setVerdict → DOM` fonctionne de bout en bout.
 *
 * On n'asserte PAS "accepté" vs "refusé" : ça dépend de la géométrie réelle
 * évaluée par Hanzi Writer, fragile sans coordonnées exactes du caractère.
 * Cf. RFC 0009.
 *
 * Note : `page.mouse` de Playwright passe par CDP `Input.dispatchMouseEvent`
 * qui n'émet **pas** de PointerEvent. On dispatch donc nous-mêmes les
 * PointerEvent côté page via `locator.evaluate(...)` pour exercer les
 * handlers onPointerDown/Move/Up de React.
 */

interface PenPoint {
  x: number;
  y: number;
}

async function drawStroke(input: Locator, points: PenPoint[]): Promise<void> {
  if (points.length < 2) throw new Error('drawStroke needs at least 2 points');
  await input.evaluate((el, sequence) => {
    function fire(type: string, x: number, y: number, isUp: boolean): void {
      const event = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y,
        pointerId: 1,
        pointerType: 'pen',
        isPrimary: true,
        pressure: isUp ? 0 : 0.5,
      });
      el.dispatchEvent(event);
    }
    const first = sequence[0]!;
    fire('pointerdown', first.x, first.y, false);
    for (let i = 1; i < sequence.length - 1; i++) {
      const p = sequence[i]!;
      fire('pointermove', p.x, p.y, false);
    }
    const last = sequence[sequence.length - 1]!;
    fire('pointermove', last.x, last.y, false);
    fire('pointerup', last.x, last.y, true);
  }, points);
}
test.describe('canvas de tracé', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: /Tracer/i })
      .first()
      .click();
    await page.getByRole('application', { name: /Zone de saisie stylet/i }).waitFor();
    // Attendre que Hanzi Writer ait fini son mount async (load des données
    // via import.meta.glob + quiz prêt) avant d'envoyer des Pointer Events.
    await page.locator('[data-renderer-mounted="true"]').waitFor();
  });

  test('un trait au stylet déclenche un message de verdict', async ({ page }) => {
    const input = page.getByRole('application', { name: /Zone de saisie stylet/i });
    const box = await input.boundingBox();
    if (!box) throw new Error('input layer not rendered');

    const left = box.x + box.width / 4;
    const top = box.y + box.height / 4;
    const right = box.x + (3 * box.width) / 4;
    const bottom = box.y + (3 * box.height) / 4;

    // Aucune validation visible avant le tracé
    await expect(page.getByTestId('verdict-message')).toHaveCount(0);

    await drawStroke(input, [
      { x: left, y: top },
      { x: (left + right) / 2, y: (top + bottom) / 2 },
      { x: right, y: bottom },
    ]);

    // Un message de verdict est affiché (accepté ou refusé, peu importe)
    await expect(page.getByTestId('verdict-message')).toBeVisible();
  });

  test('un trait laisse une polyline visible dans le SVG', async ({ page }) => {
    const input = page.getByRole('application', { name: /Zone de saisie stylet/i });
    const box = await input.boundingBox();
    if (!box) throw new Error('input layer not rendered');

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await drawStroke(input, [
      { x: cx, y: cy - 20 },
      { x: cx, y: cy + 20 },
    ]);

    // Au moins une polyline du trait user dans le DOM (validé ou refusé).
    // On utilise toBeAttached car le <svg> est aria-hidden="true"
    // (décoratif pour lecteurs d'écran), ce qui fait que Playwright considère
    // ses enfants comme "hidden" pour les checks de visibilité accessibilité.
    const polylines = page.locator('polyline');
    await expect(polylines.first()).toBeAttached();
  });
});
