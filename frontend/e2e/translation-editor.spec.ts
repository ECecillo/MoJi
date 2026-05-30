import { expect, test } from '@playwright/test';

test.describe('éditeur de traductions FR (surcharges localStorage)', () => {
  test.beforeEach(async ({ page }) => {
    // Vider localStorage avant chaque test pour repartir propre
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByPlaceholder(/Chercher/i).waitFor();
  });

  test('ajoute une trad FR à 你, la voit, la trouve via la recherche FR', async ({ page }) => {
    // Cibler 你 via la recherche
    await page.getByPlaceholder(/Chercher/i).fill('nǐ');
    // Ouvrir la fiche du premier "你"
    await page
      .getByRole('button', { name: /Détails/i })
      .first()
      .click();
    await page.getByTestId('detail-hanzi').waitFor();
    await expect(page.getByTestId('detail-hanzi')).toHaveText('你');

    // Cliquer "Ajouter une traduction" dans la section FR
    await page.getByTestId('edit-translations-fr').click();
    await page.getByTestId('translation-input').first().fill('tu, toi');
    await page.getByTestId('save-translations').click();

    // La trad apparaît + marqueur de surcharge
    await expect(page.getByText('tu, toi')).toBeVisible();
    await expect(page.getByTestId('override-marker-fr')).toBeVisible();

    // Revenir au glossaire et chercher "tu" → 你 doit ressortir
    await page.getByTestId('detail-back').click();
    await page.getByPlaceholder(/Chercher/i).fill('tu, toi');
    await expect(page.getByText('你', { exact: true })).toBeVisible();
  });

  test('persiste la trad au reload de la page', async ({ page }) => {
    await page.getByPlaceholder(/Chercher/i).fill('nǐ');
    await page
      .getByRole('button', { name: /Détails/i })
      .first()
      .click();
    await page.getByTestId('edit-translations-fr').click();
    await page.getByTestId('translation-input').first().fill('tu (informel)');
    await page.getByTestId('save-translations').click();
    await expect(page.getByText('tu (informel)')).toBeVisible();

    // Reload : la trad doit toujours être là
    await page.reload();
    await page.getByPlaceholder(/Chercher/i).fill('nǐ');
    await page
      .getByRole('button', { name: /Détails/i })
      .first()
      .click();
    await expect(page.getByText('tu (informel)')).toBeVisible();
    await expect(page.getByTestId('override-marker-fr')).toBeVisible();
  });

  test("Annuler n'écrit rien dans localStorage", async ({ page }) => {
    await page.getByPlaceholder(/Chercher/i).fill('nǐ');
    await page
      .getByRole('button', { name: /Détails/i })
      .first()
      .click();

    await page.getByTestId('edit-translations-fr').click();
    await page.getByTestId('translation-input').first().fill('volatile');
    await page.getByTestId('cancel-translations').click();

    await expect(page.getByText('volatile')).toHaveCount(0);
    const raw = await page.evaluate(() =>
      window.localStorage.getItem('sinogrammes:translation_overrides'),
    );
    expect(raw).toBeNull();
  });
});
