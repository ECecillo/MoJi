import { expect, test } from '@playwright/test';

/**
 * Tests E2E du Lot 3 — sprint 1.
 *
 * Compléter un vrai caractère via Pointer Events serait fragile (il faudrait
 * tracer les N traits exacts attendus par Hanzi Writer). À la place, on
 * vérifie la chaîne **persistance → file de révision → bouton Réviser** en
 * pré-écrivant la progression dans localStorage. C'est suffisant pour
 * verrouiller :
 *   - le bouton Réviser apparaît avec le bon compteur,
 *   - cliquer ouvre le bon caractère dans la vue practice,
 *   - le compteur survit à un reload (= persistance).
 *
 * La complétion réelle d'un caractère (Hanzi Writer → onComplete → SM-2)
 * est couverte par les tests unitaires de Canvas + useProgress.
 */

const STORAGE_KEY = 'sinogrammes:progress';

async function seedProgress(
  page: import('@playwright/test').Page,
  entries: Array<{ id: string; due: string }>,
): Promise<void> {
  await page.evaluate(
    ({ key, items }) => {
      const blob = {
        schema_version: 1,
        data: items.map((it) => ({
          ref: { type: 'character', id: it.id },
          srs_state: { interval_days: 1, ease: 2.5, due: it.due },
          stats: { attempts: 1, successes: 1, last_seen: it.due },
        })),
      };
      window.localStorage.setItem(key, JSON.stringify(blob));
    },
    { key: STORAGE_KEY, items: entries },
  );
}

test.describe('Lot 3 — bouton Réviser et file de révision', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByPlaceholder(/Chercher/i).waitFor();
  });

  test("Réviser est désactivé tant qu'aucun item n'est dû", async ({ page }) => {
    const reviewBtn = page.getByTestId('review-button');
    await expect(reviewBtn).toBeVisible();
    await expect(reviewBtn).toBeDisabled();
    await expect(reviewBtn).toContainText('0');
  });

  test("le compteur Réviser reflète le nombre d'items dus", async ({ page }) => {
    // 2 items dus dans le passé, 1 dans le futur
    const past = '2020-01-01';
    const future = '2099-12-31';
    await seedProgress(page, [
      { id: 'char_4F60', due: past },
      { id: 'char_4E00', due: past },
      { id: 'char_4E03', due: future },
    ]);
    await page.reload();
    await page.getByPlaceholder(/Chercher/i).waitFor();

    const reviewBtn = page.getByTestId('review-button');
    await expect(reviewBtn).toContainText('2');
    await expect(reviewBtn).not.toBeDisabled();
  });

  test('cliquer Réviser ouvre le canvas sur le caractère le plus en retard', async ({ page }) => {
    // char_4F60 (你) plus en retard que char_4E00 (一)
    await seedProgress(page, [
      { id: 'char_4F60', due: '2020-01-01' },
      { id: 'char_4E00', due: '2025-01-01' },
    ]);
    await page.reload();
    await page.getByPlaceholder(/Chercher/i).waitFor();

    await page.getByTestId('review-button').click();

    // Vue practice : zone stylet visible
    const input = page.getByRole('application', { name: /Zone de saisie stylet/i });
    await expect(input).toBeVisible();
    // Le caractère pratiqué est 你 (le plus en retard)
    await expect(input).toHaveAttribute('aria-label', /你/);
  });

  test('la progression persiste à travers un reload', async ({ page }) => {
    await seedProgress(page, [{ id: 'char_4F60', due: '2020-01-01' }]);
    await page.reload();
    await page.getByPlaceholder(/Chercher/i).waitFor();
    await expect(page.getByTestId('review-button')).toContainText('1');

    await page.reload();
    await page.getByPlaceholder(/Chercher/i).waitFor();
    await expect(page.getByTestId('review-button')).toContainText('1');
  });
});
