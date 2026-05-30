import { expect, test } from '@playwright/test';

test.describe('filtres du glossaire', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Chercher/i).waitFor();
  });

  test('filtre par nombre de traits limite la liste affichée', async ({ page }) => {
    // 一 (1 trait) doit être visible au démarrage
    await expect(page.getByText('一', { exact: true })).toBeVisible();
    // 你 (7 traits) aussi
    await expect(page.getByText('你', { exact: true })).toBeVisible();

    await page.getByTestId('filter-toggle').click();
    await page.getByTestId('filter-stroke-min').fill('1');
    await page.getByTestId('filter-stroke-max').fill('2');

    // 一 (1 trait) reste, 你 (7) disparaît
    await expect(page.getByText('一', { exact: true })).toBeVisible();
    await expect(page.getByText('你', { exact: true })).toHaveCount(0);

    // Reset rétablit
    await page.getByTestId('filter-reset').click();
    await expect(page.getByText('你', { exact: true })).toBeVisible();
  });

  test("bascule sur l'onglet Mots masque les filtres caractère-only", async ({ page }) => {
    await page.getByTestId('filter-toggle').click();

    await expect(page.getByTestId('filter-stroke-min')).toBeVisible();
    await expect(page.getByTestId('filter-frequency-min')).toBeVisible();

    await page.getByRole('button', { name: /Mots \(\d+\)/ }).click();

    await expect(page.getByTestId('filter-stroke-min')).toHaveCount(0);
    await expect(page.getByTestId('filter-frequency-min')).toHaveCount(0);
  });

  test("le badge du bouton Filtres reflète le nombre d'axes actifs", async ({ page }) => {
    const toggle = page.getByTestId('filter-toggle');

    // Pas de badge au démarrage : on n'attend pas un compteur explicite
    await toggle.click();
    await page.getByTestId('filter-stroke-min').fill('1');
    await page.getByTestId('filter-stroke-max').fill('3');
    // Une fois un axe rempli, le bouton de toggle contient "1"
    await expect(toggle).toContainText('1');

    await page.getByTestId('filter-frequency-min').fill('1');
    // Deux axes actifs
    await expect(toggle).toContainText('2');
  });
});
