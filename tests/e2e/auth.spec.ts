import { test, expect, accounts, build } from '../../src/fixtures/test.js';
import { epic, feature, severity, Severity, story } from 'allure-js-commons';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentification', () => {
  test.beforeEach(async () => {
    await epic('Authentification');
    await feature('Connexion');
  });

  test('connexion réussie avec des identifiants valides', { tag: ['@smoke', '@critical'] }, async ({
    loginPage,
    dashboardPage,
    page,
  }) => {
    await story('Parcours nominal');
    await severity(Severity.BLOCKER);

    await loginPage.goto();
    await loginPage.login(accounts.owner.email, accounts.owner.password);

    await expect(page).toHaveURL(/dashboard/);
    await expect(dashboardPage.userMenu).toBeVisible();
  });

  test('connexion refusée avec un mot de passe incorrect', { tag: ['@regression', '@critical'] }, async ({
    loginPage,
    page,
  }) => {
    await story('Identifiants invalides');
    await severity(Severity.CRITICAL);

    await loginPage.goto();
    await loginPage.login(accounts.wrongPassword.email, accounts.wrongPassword.password);

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(page).toHaveURL(/login/);
  });

  test("le message d'erreur ne révèle pas l'existence du compte", { tag: ['@regression', '@security'] }, async ({
    loginPage,
  }) => {
    await story('Énumération de comptes');
    await severity(Severity.CRITICAL);

    await loginPage.goto();
    await loginPage.login(accounts.wrongPassword.email, accounts.wrongPassword.password);
    const knownAccountMessage = await loginPage.errorMessage.textContent();

    await loginPage.goto();
    await loginPage.login(accounts.unknownEmail.email, accounts.unknownEmail.password);
    const unknownAccountMessage = await loginPage.errorMessage.textContent();

    // Deux messages différents permettraient de deviner quels e-mails sont inscrits.
    expect(unknownAccountMessage).toBe(knownAccountMessage);
  });

  test('un e-mail vide bloque la soumission', { tag: ['@regression'] }, async ({ loginPage, page }) => {
    await story('Validation du formulaire');
    await severity(Severity.NORMAL);

    await loginPage.goto();
    await loginPage.fillCredentials('', accounts.owner.password);
    await loginPage.submit();

    expect(await loginPage.isFieldNativelyInvalid('email')).toBe(true);
    await expect(page).toHaveURL(/login/);
  });

  test('"Se souvenir de moi" produit un cookie persistant', { tag: ['@regression'] }, async ({
    loginPage,
    page,
  }) => {
    await story('Persistance de session');
    await severity(Severity.NORMAL);

    await loginPage.goto();
    await loginPage.login(accounts.owner.email, accounts.owner.password, true);
    await expect(page).toHaveURL(/dashboard/);

    // Un cookie de session pur expire à la fermeture (expires = -1).
    const cookies = await page.context().cookies();
    expect(cookies.filter((c) => c.expires > 0).length).toBeGreaterThan(0);
  });

  test('la déconnexion révoque la session et protège les pages', { tag: ['@smoke', '@security'] }, async ({
    loginPage,
    dashboardPage,
    page,
  }) => {
    await feature('Déconnexion');
    await story("Contrôle d'accès");
    await severity(Severity.BLOCKER);

    await loginPage.goto();
    await loginPage.login(accounts.owner.email, accounts.owner.password);
    await expect(page).toHaveURL(/dashboard/);

    await dashboardPage.logout();
    await expect(page).toHaveURL(/login/);

    await page.goto('/team');
    await expect(page).toHaveURL(/login/);
    expect(await dashboardPage.sessionCookies()).toHaveLength(0);
  });

  test('un visiteur anonyme est redirigé vers la connexion', { tag: ['@smoke', '@security'] }, async ({
    page,
  }) => {
    await feature('Contrôle d\'accès');
    await severity(Severity.BLOCKER);

    await page.goto('/subscription');
    await expect(page).toHaveURL(/login/);
  });

  test('une URL inconnue renvoie une 404', { tag: ['@regression'] }, async ({ page }) => {
    await feature('Gestion des erreurs');
    await severity(Severity.NORMAL);

    const response = await page.goto('/page-inexistante');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/404/);
  });
});

test.describe('Création de compte et activation', () => {
  test.beforeEach(async () => {
    await epic('Acquisition');
    await feature('Signup et onboarding');
  });

  test(
    'un nouveau client crée son organisation et termine son onboarding',
    { tag: ['@smoke', '@critical'] },
    async ({ signupPage, onboardingPage, dashboardPage, page }) => {
      await story('Activation de bout en bout');
      await severity(Severity.BLOCKER);

      const data = build.signup();

      await signupPage.goto();
      await signupPage.signup(data);

      // L'onboarding est obligatoire avant d'accéder au produit.
      await expect(page).toHaveURL(/onboarding/);
      await expect(onboardingPage.progress).toContainText('Étape 1 sur 3');

      await onboardingPage.completeStepTeamSize('6-20');
      await expect(onboardingPage.progress).toContainText('Étape 2 sur 3');

      await onboardingPage.completeStepUseCase('analytics');
      await expect(onboardingPage.progress).toContainText('Étape 3 sur 3');

      await onboardingPage.completeStepInvite();

      await expect(page).toHaveURL(/dashboard/);
      await expect(dashboardPage.currentPlan).toContainText('Free');
      await expect(dashboardPage.seatUsage).toContainText('1 / 2');
    },
  );

  test('un e-mail déjà utilisé est refusé', { tag: ['@regression'] }, async ({ signupPage }) => {
    await story('Validation');
    await severity(Severity.CRITICAL);

    await signupPage.goto();
    await signupPage.signup(build.signup({ email: accounts.owner.email }));

    await expect(signupPage.errorMessage).toBeVisible();
    await expect(signupPage.errorMessage).toContainText(/déjà/i);
  });

  test('un mot de passe trop court est refusé', { tag: ['@regression'] }, async ({ signupPage }) => {
    await story('Validation');
    await severity(Severity.NORMAL);

    await signupPage.goto();
    await signupPage.fillForm(build.signup());
    await signupPage.passwordInput.fill('court');
    await signupPage.submit();

    // La validation HTML5 (minlength) doit bloquer avant l'aller-retour serveur.
    expect(
      await signupPage.passwordInput.evaluate((el) => !(el as HTMLInputElement).validity.valid),
    ).toBe(true);
  });

  test("l'onboarding refuse de passer une étape non renseignée", { tag: ['@regression'] }, async ({
    signupPage,
    onboardingPage,
    page,
  }) => {
    await story('Validation');
    await severity(Severity.NORMAL);

    await signupPage.goto();
    await signupPage.signup(build.signup());
    await expect(page).toHaveURL(/onboarding/);

    await onboardingPage.continueButton.click();

    expect(
      await onboardingPage.teamSizeSelect.evaluate((el) => !(el as HTMLSelectElement).validity.valid),
    ).toBe(true);
    await expect(onboardingPage.progress).toContainText('Étape 1 sur 3');
  });
});
