import { expect, test } from '@playwright/test';

test.describe('navigation glossary ↔ practice', () => {
  test('cliquer "Tracer" depuis le glossaire ouvre le canvas, le bouton retour ramène à la liste', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Chercher/i).waitFor();

    // Clic sur le premier bouton "Tracer" disponible
    const firstPractice = page.getByRole('button', { name: /Tracer/i }).first();
    await firstPractice.click();

    // Vue practice : zone de tracé stylet visible + grille
    await expect(page.getByRole('application', { name: /Zone de saisie stylet/i })).toBeVisible();

    // Compteur de traits validés à 0 au démarrage
    await expect(page.getByTestId('accepted-count')).toContainText(/0 trait/);

    // Retour via le bouton ←
    await page.getByRole('button', { name: /←/ }).click();

    // De retour au glossaire
    await expect(page.getByPlaceholder(/Chercher/i)).toBeVisible();
  });
});
