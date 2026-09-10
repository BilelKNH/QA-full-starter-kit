import { test, expect, accounts, build, plans } from '../../src/fixtures/test.js';
import { epic, feature, severity, Severity, story } from 'allure-js-commons';
import { ApiClient } from '../../src/api/api-client.js';

test.describe('API — Isolation, rôles et sièges', () => {
  test.beforeEach(async () => {
    await epic('API');
  });

  test('une ressource protégée sans jeton retourne 401', { tag: ['@smoke', '@api', '@security'] }, async ({
    api,
  }) => {
    await feature("Contrôle d'accès");
    await severity(Severity.BLOCKER);

    const response = await api.withoutToken().get('/me');
    expect(response.status()).toBe(401);
  });

  test('un jeton invalide retourne 401', { tag: ['@regression', '@api', '@security'] }, async ({ api }) => {
    await feature("Contrôle d'accès");
    await severity(Severity.BLOCKER);

    const response = await api.get('/me', undefined);
    expect(response.status()).toBe(401);
  });

  test('GET /members est paginé et limité au tenant', { tag: ['@regression', '@api'] }, async ({ api }) => {
    await feature('Membres');
    await story('Isolation multi-tenant');
    await severity(Severity.BLOCKER);

    await api.loginAs(accounts.owner.email, accounts.owner.password);
    const response = await api.get('/members', { page: 1, limit: 10 });
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      data: Array<{ email: string }>;
      total: number;
      page: number;
      limit: number;
    };
    expect(body).toHaveProperty('total');
    expect(body.page).toBe(1);
    expect(body.data.length).toBeLessThanOrEqual(10);
    // Tous les membres retournés appartiennent bien à l'organisation Acme.
    expect(body.data.every((m) => m.email.endsWith('@acme.test'))).toBe(true);
  });

  test(
    "un tenant ne voit pas les membres d'un autre tenant",
    { tag: ['@critical', '@api', '@security'] },
    async ({ api, request }) => {
      await feature('Membres');
      await story('Isolation multi-tenant');
      await severity(Severity.BLOCKER);

      // Tenant A : on relève l'identifiant d'un de ses membres.
      await api.loginAs(accounts.owner.email, accounts.owner.password);
      const membersA = (await (await api.get('/members')).json()) as { data: Array<{ id: string }> };
      const targetId = membersA.data[0]?.id;
      expect(targetId).toBeTruthy();

      // Tenant B, fraîchement créé, tente d'y accéder.
      const tenantB = new ApiClient(request);
      await tenantB.signupAndLogin(build.signup());
      const response = await tenantB.get(`/members/${targetId}`);

      expect(response.status()).toBe(404);
      await tenantB.cleanup();
    },
  );

  test(
    'un membre ne peut pas créer une invitation',
    { tag: ['@critical', '@api', '@security'] },
    async ({ api }) => {
      await feature("Contrôle d'accès");
      await story('Rôles');
      await severity(Severity.BLOCKER);

      await api.loginAs(accounts.member.email, accounts.member.password);
      const response = await api.post('/invitations', { email: build.email(), role: 'member' });

      expect(response.status()).toBe(403);
    },
  );

  test(
    "un admin ne peut pas modifier l'abonnement",
    { tag: ['@critical', '@api', '@security', '@revenue'] },
    async ({ api }) => {
      await feature("Contrôle d'accès");
      await story('Rôles');
      await severity(Severity.BLOCKER);

      await api.loginAs(accounts.admin.email, accounts.admin.password);
      const response = await api.put('/subscription', { plan: 'business' });

      expect(response.status()).toBe(403);
    },
  );

  test(
    'la limite de sièges du plan Free est appliquée côté API',
    { tag: ['@critical', '@api', '@revenue'] },
    async ({ api }) => {
      await feature('Sièges');
      await story('Limite de plan');
      await severity(Severity.BLOCKER);

      await api.signupAndLogin(build.signup());

      // Plan Free = 2 sièges, dont le propriétaire : une seule invitation possible.
      expect((await api.post('/invitations', { email: build.email() })).status()).toBe(201);

      const blocked = await api.post('/invitations', { email: build.email() });
      expect(blocked.status()).toBe(402);
      const error = (await blocked.json()) as { code?: string; plan?: string };
      expect(error.code).toBe('seat_limit_reached');
      expect(error.plan).toBe(plans.free.id);
    },
  );

  test(
    "l'upgrade vers Pro lève la limite et met à jour l'état d'abonnement",
    { tag: ['@critical', '@api', '@revenue'] },
    async ({ api }) => {
      await feature('Abonnement');
      await story('Upgrade');
      await severity(Severity.BLOCKER);

      await api.signupAndLogin(build.signup());
      await api.post('/invitations', { email: build.email() });
      expect((await api.post('/invitations', { email: build.email() })).status()).toBe(402);

      expect((await api.put('/subscription', { plan: 'pro' })).status()).toBe(200);

      const state = (await (await api.get('/subscription')).json()) as {
        plan: string;
        seatsLimit: number;
      };
      expect(state.plan).toBe('pro');
      expect(state.seatsLimit).toBe(plans.pro.seats);

      expect((await api.post('/invitations', { email: build.email() })).status()).toBe(201);
    },
  );

  test('un plan inconnu est refusé', { tag: ['@regression', '@api'] }, async ({ api }) => {
    await feature('Abonnement');
    await story('Validation');
    await severity(Severity.NORMAL);

    await api.signupAndLogin(build.signup());
    const response = await api.put('/subscription', { plan: 'entreprise-imaginaire' });
    expect(response.status()).toBe(400);
  });

  test('une ressource inexistante retourne un message structuré', { tag: ['@regression', '@api'] }, async ({
    api,
  }) => {
    await feature('Contrat');
    await severity(Severity.NORMAL);

    await api.loginAs(accounts.owner.email, accounts.owner.password);
    const response = await api.get('/members/usr_inexistant');

    expect(response.status()).toBe(404);
    const error = (await response.json()) as { message?: string };
    expect(typeof error.message).toBe('string');
  });
});
