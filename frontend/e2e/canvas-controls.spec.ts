import { expect, test } from '@playwright/test';

import type { Locator } from '@playwright/test';

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

test.describe('canvas — boutons Annuler et Tout effacer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: /Tracer/i })
      .first()
      .click();
    await page.getByRole('application', { name: /Zone de saisie stylet/i }).waitFor();
    await page.locator('[data-renderer-mounted="true"]').waitFor();
  });

  test("les boutons sont désactivés à l'arrivée puis actifs après un trait", async ({ page }) => {
    await expect(page.getByTestId('undo-last')).toBeDisabled();
    await expect(page.getByTestId('reset-all')).toBeDisabled();

    const input = page.getByRole('application', { name: /Zone de saisie stylet/i });
    const box = await input.boundingBox();
    if (!box) throw new Error('input layer not rendered');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await drawStroke(input, [
      { x: cx - 20, y: cy - 20 },
      { x: cx + 20, y: cy + 20 },
    ]);

    await expect(page.getByTestId('undo-last')).not.toBeDisabled();
    await expect(page.getByTestId('reset-all')).not.toBeDisabled();
  });

  test('Tout effacer remet le compteur à zéro et supprime les polylines utilisateur', async ({
    page,
  }) => {
    const input = page.getByRole('application', { name: /Zone de saisie stylet/i });
    const box = await input.boundingBox();
    if (!box) throw new Error('input layer not rendered');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await drawStroke(input, [
      { x: cx - 30, y: cy - 30 },
      { x: cx + 30, y: cy + 30 },
    ]);

    // Au moins une polyline user tracée
    await expect(page.locator('polyline').first()).toBeAttached();

    await page.getByTestId('reset-all').click();

    // Plus de verdict, compteur à 0
    await expect(page.getByTestId('verdict-message')).toHaveCount(0);
    await expect(page.getByTestId('accepted-count')).toContainText(/0 trait/);

    // Plus de polyline user (un re-rendu peut laisser le polyline du quiz
    // Hanzi Writer, mais aucune polyline portant nos data-testid stroke-*)
    await expect(page.getByTestId('stroke-accepted')).toHaveCount(0);
    await expect(page.getByTestId('stroke-refused')).toHaveCount(0);
  });

  test('Annuler retire seulement le dernier trait du SVG et efface le verdict', async ({
    page,
  }) => {
    const input = page.getByRole('application', { name: /Zone de saisie stylet/i });
    const box = await input.boundingBox();
    if (!box) throw new Error('input layer not rendered');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Premier trait
    await drawStroke(input, [
      { x: cx - 40, y: cy - 40 },
      { x: cx - 10, y: cy - 10 },
    ]);
    // Second trait clairement séparé du premier
    await drawStroke(input, [
      { x: cx + 10, y: cy + 10 },
      { x: cx + 40, y: cy + 40 },
    ]);

    const beforeCount = await page.getByTestId('stroke-accepted').count();
    const beforeRefused = await page.getByTestId('stroke-refused').count();
    const totalBefore = beforeCount + beforeRefused;
    expect(totalBefore).toBeGreaterThanOrEqual(1);

    await page.getByTestId('undo-last').click();

    // Le verdict disparaît
    await expect(page.getByTestId('verdict-message')).toHaveCount(0);

    // Au moins un trait de moins dans le DOM
    const afterCount = await page.getByTestId('stroke-accepted').count();
    const afterRefused = await page.getByTestId('stroke-refused').count();
    const totalAfter = afterCount + afterRefused;
    expect(totalAfter).toBe(totalBefore - 1);
  });
});
