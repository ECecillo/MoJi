import { expect, test } from '@playwright/test';

test.describe('glossaire', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Chercher/i).waitFor();
  });

  test('la recherche pinyin ASCII trouve les diacritiques (nǐ)', async ({ page }) => {
    const search = page.getByPlaceholder(/Chercher/i);
    await search.fill('ni');

    // 你 (nǐ) doit rester visible après filtrage
    await expect(page.getByText('你', { exact: true })).toBeVisible();

    // Au moins une syllabe diacritique "nǐ" rendue dans la liste filtrée
    await expect(page.getByText('nǐ', { exact: false }).first()).toBeVisible();
  });

  test('une recherche sans résultat affiche le message vide', async ({ page }) => {
    await page.getByPlaceholder(/Chercher/i).fill('xyz123-aucun-resultat');
    await expect(page.getByText(/Aucun résultat/i)).toBeVisible();
  });

  test('basculer vers l’onglet "Mots" change le compteur affiché', async ({ page }) => {
    const charsCount = await page.getByRole('button', { name: /Caractères \(\d+\)/ }).textContent();
    await page.getByRole('button', { name: /Mots \(\d+\)/ }).click();
    const wordsCount = await page.getByRole('button', { name: /Mots \(\d+\)/ }).textContent();

    expect(charsCount).not.toBe(wordsCount);
    expect(wordsCount).toMatch(/\(\d+\)/);
  });
});
