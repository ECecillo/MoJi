import { expect, test } from '@playwright/test';

import type { Locator } from '@playwright/test';

/**
 * Régression spécifique au bug StrictMode du Lot 1 : la 1ʳᵉ `renderer.mount()`
 * résolvait après son propre cleanup et clobbait le `_quiz` du 2ᵉ mount,
 * faisant lever `validateStroke` au premier trait. Le scénario qui le
 * révèlait à l'usage était :
 *
 *   1. Ouvrir le canvas (StrictMode déclenche mount/unmount/mount).
 *   2. Toggler l'outline plusieurs fois (force des re-renders, exerce les
 *      transitions de visibilité Hanzi Writer).
 *   3. Tracer un trait.
 *   4. Le verdict doit s'afficher SANS exception.
 *
 * Si le bug revient, le trait ne déclenchera pas de verdict (l'erreur
 * `Quiz is not ready` casse l'enchaînement). Ce test verrouille la
 * non-régression.
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

test.describe('régression StrictMode (toggle outline + tracé)', () => {
  test("toggle outline plusieurs fois puis trace un trait : pas d'exception, verdict visible", async ({
    page,
  }) => {
    // Collecter les erreurs JS et les console.error éventuels — si le bug
    // StrictMode revient, on verra une erreur "Quiz is not ready" ou
    // "Cannot read properties of null".
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await page
      .getByRole('button', { name: /Tracer/i })
      .first()
      .click();

    const input = page.getByRole('application', { name: /Zone de saisie stylet/i });
    await input.waitFor();
    await page.locator('[data-renderer-mounted="true"]').waitFor();

    // 3 toggles d'outline : on exerce le useEffect de mount via mountVersion
    // sans déclencher de remount Hanzi Writer (le bug aurait remonté
    // l'instance et perdu le quiz si la régression revenait).
    const outlineButton = page.getByRole('button', { name: /Outline/i });
    for (let i = 0; i < 3; i++) {
      await outlineButton.click();
    }

    // L'instance doit toujours être marquée mounted
    await expect(page.locator('[data-renderer-mounted="true"]')).toBeVisible();

    // Tracé : un trait diagonal qui passe par le centre du canvas
    const box = await input.boundingBox();
    if (!box) throw new Error('input layer not rendered');

    const left = box.x + box.width / 4;
    const top = box.y + box.height / 4;
    const right = box.x + (3 * box.width) / 4;
    const bottom = box.y + (3 * box.height) / 4;

    await drawStroke(input, [
      { x: left, y: top },
      { x: (left + right) / 2, y: (top + bottom) / 2 },
      { x: right, y: bottom },
    ]);

    // Le verdict doit s'afficher (accepté ou refusé peu importe, ce qui
    // compte c'est qu'aucune exception n'a interrompu la chaîne pointer →
    // validateStroke → setVerdict → DOM).
    await expect(page.getByTestId('verdict-message')).toBeVisible();

    // Aucun pageerror et aucun console.error pertinent (on filtre les
    // warnings React éventuels qui n'ont rien à voir avec le bug).
    const relevantConsoleErrors = consoleErrors.filter(
      (e) =>
        e.toLowerCase().includes('quiz') ||
        e.toLowerCase().includes('hanzi') ||
        e.includes('TypeError') ||
        e.toLowerCase().includes('cannot read'),
    );
    expect(pageErrors).toEqual([]);
    expect(relevantConsoleErrors).toEqual([]);
  });

  test('toggle outline 10 fois consécutivement reste stable', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');
    await page
      .getByRole('button', { name: /Tracer/i })
      .first()
      .click();

    const input = page.getByRole('application', { name: /Zone de saisie stylet/i });
    await input.waitFor();
    await page.locator('[data-renderer-mounted="true"]').waitFor();

    // Stress test : 10 toggles consécutifs sans pause. Si le mount
    // remontait à chaque toggle (bug initial), on aurait des cleanups
    // entrelacés qui clobberaient l'instance.
    const outlineButton = page.getByRole('button', { name: /Outline/i });
    for (let i = 0; i < 10; i++) {
      await outlineButton.click();
    }

    // L'instance reste mountée et la zone d'input reste interactive
    await expect(page.locator('[data-renderer-mounted="true"]')).toBeVisible();
    await expect(input).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
