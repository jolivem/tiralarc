import type { Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BASE_URL, emailedLink, launch, newPage, skipTour } from './helpers';

/**
 * The main journeys, in a real browser against the running app: a visitor looks through the
 * example journal; a new archer signs up, opens their first journal, notes a session, fills its
 * sheet, then deletes their account (which leaves the dev database as it was).
 */
describe('Journeys', () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await launch();
  });

  afterAll(async () => {
    await browser?.close();
  });

  it('a visitor looks through the example journal, read-only', async () => {
    const page = await newPage(browser);
    await page.goto(`${BASE_URL}/fr`);
    await expect(
      page
        .getByRole('heading', { name: /Le carnet de tir à l.arc qui suit vos progrès/ })
        .isVisible(),
    ).resolves.toBe(true);
    await page.getByRole('button', { name: 'Voir un exemple' }).click();
    await page.waitForURL('**/fr/archer');
    await expect(page.getByText("Journal d'exemple").first().isVisible()).resolves.toBe(true);
    await skipTour(page);

    await page.goto(`${BASE_URL}/fr/archer/stats`);
    await skipTour(page);
    await expect(page.getByText('Moyenne par flèche').first().isVisible()).resolves.toBe(true);

    // Back out to the sign-up page.
    await page.getByRole('button', { name: 'Créer mon compte' }).first().click();
    await page.waitForURL('**/fr/register');
    await page.context().close();
  });

  it('a new archer signs up, notes a session, then deletes their account', async () => {
    const page = await newPage(browser);
    const email = `e2e-${Date.now()}@example.com`;
    const password = 'arc-et-fleches-2026';

    // Sign up, then the emailed confirmation link.
    await page.goto(`${BASE_URL}/fr/register`);
    await page.getByLabel('Nom affiché').fill('Robin E2E');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mot de passe (8 caractères min.)').fill(password);
    await page.getByLabel('Confirmer le mot de passe').fill(password);
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await page.waitForURL('**/register/check-email**');
    await page.goto(await emailedLink(email, '/verify-email'));
    await page.getByRole('button', { name: 'Confirmer mon email' }).click();
    await page.waitForURL('**/fr/archer');

    // The first journal: its dialog opens by itself.
    const dialog = page.getByRole('dialog', { name: 'Créez votre premier journal' });
    await dialog.getByLabel('Titre').fill('Saison E2E');
    await dialog.getByRole('radio', { name: 'Non' }).check();
    await dialog.getByRole('button', { name: 'Créer le journal' }).click();
    await dialog.waitFor({ state: 'hidden' });
    await skipTour(page);
    await expect(page.getByText('Pour bien démarrer').isVisible()).resolves.toBe(true);

    // A training today, from the date's pen: its sheet opens.
    await page.getByRole('button', { name: "Noter un événement aujourd'hui" }).click();
    const create = page.getByRole('dialog', { name: 'Nouvel événement' });
    await create.getByRole('radio', { name: 'Entraînement' }).click();
    await create.getByRole('button', { name: "Créer l'événement" }).click();
    await page.waitForURL('**/fr/archer/journal/*');
    await skipTour(page);
    await page.getByLabel('Nombre de flèches').fill('72');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Enregistré.').waitFor()).resolves.toBeUndefined();

    // Account page: delete it, its email typed again and its password.
    await page.goto(`${BASE_URL}/fr/account`);
    await page.getByRole('button', { name: 'Supprimer mon compte' }).click();
    const confirm = page.getByRole('dialog', { name: 'Supprimer votre compte ?' });
    await confirm.getByLabel(/Pour confirmer, tapez votre adresse email/).fill(email);
    await confirm.getByLabel('Votre mot de passe').fill(password);
    await confirm.getByRole('button', { name: 'Supprimer définitivement' }).click();
    await page.waitForURL('**/fr?account=deleted');
    await expect(page.getByText('Votre compte a été supprimé').isVisible()).resolves.toBe(true);
    await page.context().close();
  });
});
