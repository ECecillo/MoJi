import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test("l'application charge avec le glossaire visible par défaut", async ({ page }) => {
    await page.goto('/');

    // Titre principal de l'app
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sinogrammes');

    // Glossaire chargé : champ de recherche + onglets caractères/mots
    await expect(page.getByPlaceholder(/Chercher/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Caractères/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Mots/i })).toBeVisible();

    // Locale par défaut = français
    await expect(page.getByTestId('current-language')).toContainText('fr');
  });

  test('la liste affiche au moins une centaine de caractères HSK 1', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Caractères \(\d+\)/ }).waitFor();

    const countLabel = await page.getByRole('button', { name: /Caractères \(\d+\)/ }).textContent();
    const match = countLabel?.match(/\((\d+)\)/);
    const count = match ? Number.parseInt(match[1]!, 10) : 0;

    expect(count).toBeGreaterThanOrEqual(100);
  });
});
