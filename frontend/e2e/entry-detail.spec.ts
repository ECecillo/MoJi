import { expect, test } from '@playwright/test';

test.describe('fiche détaillée (glossary → detail → practice)', () => {
  test('cliquer "Détails" depuis le glossaire ouvre la fiche, navigue vers practice et revient', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Chercher/i).waitFor();

    // Clic sur le premier bouton "Détails" disponible
    const firstDetail = page.getByRole('button', { name: /Détails/i }).first();
    await firstDetail.click();

    // Vue détail : on voit la zone détail, un hanzi en grand et un pinyin
    await expect(page.getByTestId('entry-detail')).toBeVisible();
    await expect(page.getByTestId('detail-hanzi')).toBeVisible();
    await expect(page.getByTestId('detail-pinyin')).toBeVisible();

    // Section informations (HSK level visible)
    await expect(page.getByText(/Informations/i)).toBeVisible();
    await expect(page.getByText(/Sens/i)).toBeVisible();

    // Le bouton Tracer dédié de la fiche déclenche la navigation vers practice
    await page.getByTestId('detail-practice').click();
    await expect(page.getByRole('application', { name: /Zone de saisie stylet/i })).toBeVisible();

    // Le bouton ← du header ramène à la fiche détail (back stack respecté)
    await page.getByRole('button', { name: /←/ }).click();
    await expect(page.getByTestId('entry-detail')).toBeVisible();

    // Le bouton ← Glossaire de la fiche ramène au glossaire
    await page.getByTestId('detail-back').click();
    await expect(page.getByPlaceholder(/Chercher/i)).toBeVisible();
  });

  test("depuis la fiche d'un caractère, cliquer un mot lié ouvre sa fiche", async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Chercher/i).waitFor();

    // On cible "你" précisément pour avoir au moins un mot lié (你们).
    await page.getByPlaceholder(/Chercher/i).fill('ni');
    const detailButton = page.getByRole('button', { name: /Détails/i }).first();
    await detailButton.click();

    await expect(page.getByTestId('entry-detail')).toBeVisible();

    // Au moins un mot lié doit être présent et cliquable
    const relatedWords = page.getByTestId('related-word');
    await expect(relatedWords.first()).toBeVisible();

    const firstWordHanzi = await relatedWords.first().textContent();
    await relatedWords.first().click();

    // On reste sur la vue détail mais l'entry affichée a changé
    await expect(page.getByTestId('entry-detail')).toBeVisible();
    const newHanzi = await page.getByTestId('detail-hanzi').textContent();
    expect(firstWordHanzi).toContain(newHanzi ?? '');
  });

  test("depuis la fiche d'un mot, les caractères constitutifs sont cliquables", async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Chercher/i).waitFor();

    // Aller sur l'onglet mots
    await page.getByRole('button', { name: /Mots \(\d+\)/ }).click();

    // Ouvrir la fiche du premier mot
    const firstDetail = page.getByRole('button', { name: /Détails/i }).first();
    await firstDetail.click();

    // Section "Caractères constitutifs" présente (un mot HSK 1 a au moins un caractère)
    await expect(page.getByText(/Caractères constitutifs/i)).toBeVisible();

    const constituents = page.getByTestId('constituent-character');
    await expect(constituents.first()).toBeVisible();

    // Cliquer un caractère constitutif ouvre sa fiche
    await constituents.first().click();
    await expect(page.getByTestId('entry-detail')).toBeVisible();
  });
});
