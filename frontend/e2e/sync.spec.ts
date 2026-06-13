import { expect, test } from '@playwright/test';

/**
 * Tests E2E de la synchronisation backend (Lot 3, cf. RFC 0011).
 *
 * Sans backend réel sous Playwright, on mocke `/api/progress` via `page.route`
 * AVANT la navigation pour intercepter l'auto-sync au chargement :
 *   - GET → renvoie la progression distante (JSON) ;
 *   - POST → 204, et on capture le corps poussé.
 *
 * On vérifie ainsi de bout en bout le chemin client pull → merge → push :
 *   - une entrée distante due est fusionnée et fait apparaître le bouton Réviser ;
 *   - l'état local est bien poussé au serveur.
 */

const STORAGE_KEY = 'sinogrammes:progress';

test.describe('Lot 3 — synchronisation backend (API mockée)', () => {
  test('une progression distante est récupérée et fusionnée au chargement', async ({ page }) => {
    const remote = [
      {
        ref: { type: 'character', id: 'char_4F60' },
        srs_state: { interval_days: 1, ease: 2.5, due: '2020-01-01' },
        stats: { attempts: 1, successes: 1, last_seen: '2020-01-01' },
      },
    ];

    await page.route('**/api/progress', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(remote),
        });
      } else {
        await route.fulfill({ status: 204, body: '' });
      }
    });

    await page.goto('/');
    await page.getByPlaceholder(/Chercher/i).waitFor();

    // L'entrée distante (due en 2020) doit faire passer le compteur Réviser à 1.
    const reviewBtn = page.getByTestId('review-button');
    await expect(reviewBtn).toContainText('1');
    await expect(reviewBtn).not.toBeDisabled();

    // Et cliquer ouvre bien le caractère synchronisé (你).
    await reviewBtn.click();
    const input = page.getByRole('application', { name: /Zone de saisie stylet/i });
    await expect(input).toHaveAttribute('aria-label', /你/);
  });

  test('la progression locale est poussée au serveur', async ({ page }) => {
    let pushed: string | null = null;

    await page.route('**/api/progress', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      } else {
        pushed = route.request().postData();
        await route.fulfill({ status: 204, body: '' });
      }
    });

    // Pré-écrit une progression locale, puis recharge pour déclencher la sync.
    await page.goto('/');
    await page.evaluate(
      ({ key }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            schema_version: 1,
            data: [
              {
                ref: { type: 'character', id: 'char_4E00' },
                srs_state: { interval_days: 3, ease: 2.5, due: '2026-06-20' },
                stats: { attempts: 4, successes: 3, last_seen: '2026-06-10' },
              },
            ],
          }),
        );
      },
      { key: STORAGE_KEY },
    );
    await page.reload();
    await page.getByPlaceholder(/Chercher/i).waitFor();

    await expect.poll(() => pushed).not.toBeNull();
    expect(pushed).toContain('char_4E00');
  });
});
