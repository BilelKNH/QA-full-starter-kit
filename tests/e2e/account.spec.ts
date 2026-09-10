import { test, expect, build } from '../../src/fixtures/test.js';
import { epic, feature, severity, Severity, story } from 'allure-js-commons';

test.describe('Navigation et facturation (lecture seule)', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await epic('Produit');
    await dashboardPage.goto();
  });

  test('navigation entre les sections principales', { tag: ['@smoke'] }, async ({ navigation, page }) => {
    await feature('Navigation');
    await severity(Severity.CRITICAL);

    await navigation.goTo('Équipe');
    await expect(page).toHaveURL(/team/);

    await navigation.goTo('Abonnement');
    await expect(page).toHaveURL(/subscription/);

    await navigation.goTo('Facturation');
    await expect(page).toHaveURL(/billing/);

    await navigation.goTo('Dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('le bouton retour restaure la page précédente', { tag: ['@regression'] }, async ({
    navigation,
    page,
  }) => {
    await feature('Navigation');
    await severity(Severity.NORMAL);

    await navigation.goTo('Équipe');
    await expect(page).toHaveURL(/team/);
    await page.goBack();
    await expect(page).toHaveURL(/dashboard/);
  });

  test("l'historique de facturation liste les factures émises", { tag: ['@regression'] }, async ({
    navigation,
    page,
  }) => {
    await feature('Facturation');
    await story('Consultation');
    await severity(Severity.NORMAL);

    await navigation.goTo('Facturation');
    const invoices = page.getByTestId('invoice-row');
    await expect(invoices.first()).toBeVisible();
    expect(await invoices.count()).toBeGreaterThan(0);
  });
});

test.describe('Navigation mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'Projet mobile uniquement');

  test('le menu burger ouvre la navigation', { tag: ['@regression', '@mobile'] }, async ({
    dashboardPage,
    navigation,
  }) => {
    await epic('Produit');
    await feature('Responsive');
    await severity(Severity.NORMAL);

    await dashboardPage.goto();
    await expect(navigation.burgerButton).toBeVisible();
    await navigation.openMobileMenu();
    await expect(navigation.mobileNav).toBeVisible();
  });
});

test.describe('Paramètres du compte — tenant isolé', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ signupPage, onboardingPage, page }) => {
    await epic('Produit');
    await feature('Paramètres');

    await signupPage.goto();
    await signupPage.signup(build.signup());
    await onboardingPage.completeAll();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('modifier son nom met à jour le profil', { tag: ['@regression'] }, async ({ settingsPage }) => {
    await story('Profil');
    await severity(Severity.NORMAL);

    await settingsPage.goto();
    await settingsPage.updateName('Camille Testeuse');

    await expect(settingsPage.successMessage).toBeVisible();
    await expect(settingsPage.nameInput).toHaveValue('Camille Testeuse');
  });

  test('un nom vide est refusé', { tag: ['@regression'] }, async ({ settingsPage }) => {
    await story('Profil');
    await severity(Severity.MINOR);

    await settingsPage.goto();
    await settingsPage.nameInput.fill('');
    await settingsPage.saveProfileButton.click();

    expect(
      await settingsPage.nameInput.evaluate((el) => !(el as HTMLInputElement).validity.valid),
    ).toBe(true);
  });

  test('changer de mot de passe exige le mot de passe actuel', { tag: ['@critical', '@security'] }, async ({
    settingsPage,
  }) => {
    await story('Sécurité du compte');
    await severity(Severity.BLOCKER);

    await settingsPage.goto();
    await settingsPage.changePassword('MauvaisMotDePasse!', 'NouveauPass123!');

    await expect(settingsPage.errorMessage).toBeVisible();
    await expect(settingsPage.errorMessage).toContainText(/actuel est incorrect/i);
  });
});
