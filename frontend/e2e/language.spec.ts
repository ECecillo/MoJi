import { expect, test } from '@playwright/test';

test.describe('toggle de langue FR ↔ EN', () => {
  test('cliquer sur le bouton de langue bascule la locale et les labels', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('current-language')).toContainText('fr');
    await expect(page.getByPlaceholder(/Chercher/i)).toBeVisible();

    // Le bouton actuel affiche la cible alternative ("Anglais" en FR)
    await page.getByTestId('language-toggle').click();

    await expect(page.getByTestId('current-language')).toContainText('en');
    // En anglais, le placeholder devient "Search ..."
    await expect(page.getByPlaceholder(/Search/i)).toBeVisible();
  });

  test('rebascule au français après deux toggles', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByTestId('language-toggle');
    await toggle.click();
    await toggle.click();
    await expect(page.getByTestId('current-language')).toContainText('fr');
  });
});
