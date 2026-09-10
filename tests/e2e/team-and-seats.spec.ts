import { test, expect, build, accounts } from '../../src/fixtures/test.js';
import { epic, feature, severity, Severity, story } from 'allure-js-commons';
import { STORAGE_STATE_ADMIN, STORAGE_STATE_MEMBER } from '../../src/utils/env.js';

/**
 * Les tests qui MUTENT des données créent leur propre organisation via le
 * signup UI : chaque test travaille dans son tenant, la suite reste
 * parallélisable sans collision d'état.
 */
test.describe('Équipe et sièges — tenant isolé', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ signupPage, onboardingPage, page }) => {
    await epic('Revenu');
    await feature('Sièges et invitations');

    await signupPage.goto();
    await signupPage.signup(build.signup());
    await expect(page).toHaveURL(/onboarding/);
    await onboardingPage.completeAll();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('le propriétaire invite un membre et le siège est décompté', { tag: ['@smoke', '@critical'] }, async ({
    teamPage,
  }) => {
    await story('Invitation nominale');
    await severity(Severity.BLOCKER);

    await teamPage.goto();
    await expect(teamPage.seatUsage).toContainText('1 / 2');

    await teamPage.invite(build.email(), 'member');

    await expect(teamPage.successMessage).toBeVisible();
    await expect(teamPage.seatUsage).toContainText('2 / 2');
    await expect(teamPage.invitationRows).toHaveCount(1);
  });

  test(
    'la limite de sièges du plan Free bloque une invitation supplémentaire',
    { tag: ['@critical', '@revenue'] },
    async ({ teamPage }) => {
      await story('Limite de sièges');
      await severity(Severity.BLOCKER);

      await teamPage.goto();
      await teamPage.invite(build.email());
      await expect(teamPage.seatUsage).toContainText('2 / 2');

      // Sièges épuisés : le formulaire doit être verrouillé côté UI…
      await expect(teamPage.seatsExhaustedBanner).toBeVisible();
      await expect(teamPage.inviteButton).toBeDisabled();
    },
  );

  test(
    "la limite de sièges est aussi appliquée côté serveur, pas seulement dans l'UI",
    { tag: ['@critical', '@revenue', '@security'] },
    async ({ teamPage, page, api }) => {
      await story('Limite de sièges');
      await severity(Severity.BLOCKER);

      await teamPage.goto();
      await teamPage.invite(build.email());
      await expect(teamPage.seatUsage).toContainText('2 / 2');

      // Un bouton désactivé n'est pas un contrôle d'accès : on rejoue l'appel
      // directement contre l'API avec la session du navigateur.
      const response = await page.request.post('/team/invite', {
        form: { email: build.email(), role: 'member' },
        failOnStatusCode: false,
      });

      expect(response.status()).toBe(402);
      void api;
    },
  );

  test('un e-mail déjà invité est refusé', { tag: ['@regression'] }, async ({
    teamPage,
    subscriptionPage,
  }) => {
    await story('Doublons');
    await severity(Severity.NORMAL);

    // On passe sur Pro pour que la limite de sièges ne soit pas le facteur
    // bloquant : ce test doit isoler le contrôle de doublon, rien d'autre.
    await subscriptionPage.goto();
    await subscriptionPage.switchTo('pro');

    const email = build.email();
    await teamPage.goto();
    await teamPage.invite(email);
    await expect(teamPage.successMessage).toBeVisible();

    await teamPage.invite(email);
    await expect(teamPage.errorMessage).toBeVisible();
    await expect(teamPage.errorMessage).toContainText(/déjà/i);
  });

  test(
    'passer au plan Pro débloque de nouveaux sièges',
    { tag: ['@critical', '@revenue'] },
    async ({ teamPage, subscriptionPage }) => {
      await feature('Abonnement');
      await story('Upgrade pour lever une limite');
      await severity(Severity.BLOCKER);

      await teamPage.goto();
      await teamPage.invite(build.email());
      await expect(teamPage.inviteButton).toBeDisabled();

      await subscriptionPage.goto();
      expect(await subscriptionPage.currentPlan()).toBe('free');
      await subscriptionPage.switchTo('pro');
      await expect(subscriptionPage.successMessage).toBeVisible();
      expect(await subscriptionPage.currentPlan()).toBe('pro');

      await teamPage.goto();
      await expect(teamPage.seatUsage).toContainText('2 / 10');
      await expect(teamPage.inviteButton).toBeEnabled();
    },
  );

  test(
    'une rétrogradation est refusée si les sièges dépassent le plan cible',
    { tag: ['@critical', '@revenue'] },
    async ({ teamPage, subscriptionPage }) => {
      await feature('Abonnement');
      await story('Downgrade contraint');
      await severity(Severity.CRITICAL);

      await subscriptionPage.goto();
      await subscriptionPage.switchTo('pro');

      await teamPage.goto();
      for (let i = 0; i < 2; i += 1) await teamPage.invite(build.email());
      await expect(teamPage.seatUsage).toContainText('3 / 10');

      await subscriptionPage.goto();
      await subscriptionPage.switchTo('free');

      await expect(subscriptionPage.errorMessage).toBeVisible();
      await expect(subscriptionPage.errorMessage).toContainText(/limité à 2 sièges/i);
      expect(await subscriptionPage.currentPlan()).toBe('pro');
    },
  );
});

/**
 * Tests en lecture seule sur l'organisation de référence : ils réutilisent
 * la session persistée par le setup et ne modifient rien.
 */
test.describe("Contrôle d'accès par rôle", () => {
  test.beforeEach(async () => {
    await epic('Revenu');
    await feature("Contrôle d'accès");
  });

  test('le propriétaire voit les commandes de facturation', { tag: ['@smoke'] }, async ({
    subscriptionPage,
  }) => {
    await severity(Severity.CRITICAL);

    await subscriptionPage.goto();
    await expect(subscriptionPage.planCard('pro')).toBeVisible();
    await expect(subscriptionPage.forbiddenNotice).toBeHidden();
  });

  test.describe('en tant que membre', () => {
    test.use({ storageState: STORAGE_STATE_MEMBER });

    test('un membre ne peut pas inviter', { tag: ['@critical', '@security'] }, async ({ teamPage }) => {
      await severity(Severity.BLOCKER);

      await teamPage.goto();
      await expect(teamPage.inviteForbidden).toBeVisible();
      await expect(teamPage.inviteButton).toHaveCount(0);
    });

    test("un membre ne peut pas modifier l'abonnement", { tag: ['@critical', '@security'] }, async ({
      subscriptionPage,
    }) => {
      await severity(Severity.BLOCKER);

      await subscriptionPage.goto();
      await expect(subscriptionPage.forbiddenNotice).toBeVisible();
    });
  });

  test.describe('en tant qu\'admin', () => {
    test.use({ storageState: STORAGE_STATE_ADMIN });

    test('un admin peut inviter mais pas facturer', { tag: ['@critical', '@security'] }, async ({
      teamPage,
      subscriptionPage,
    }) => {
      await severity(Severity.CRITICAL);

      await teamPage.goto();
      await expect(teamPage.inviteButton).toBeVisible();

      await subscriptionPage.goto();
      await expect(subscriptionPage.forbiddenNotice).toBeVisible();
    });
  });

  void accounts;
});
