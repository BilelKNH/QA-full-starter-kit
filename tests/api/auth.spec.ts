import { test, expect, accounts, build, invalidSignups } from '../../src/fixtures/test.js';
import { epic, feature, severity, Severity, story } from 'allure-js-commons';

test.describe('API — Authentification', () => {
  test.beforeEach(async () => {
    await epic('API');
    await feature('Authentification');
  });

  test('GET /health répond 200', { tag: ['@smoke', '@api'] }, async ({ api }) => {
    await severity(Severity.BLOCKER);
    const response = await api.get('/health');
    expect(response.ok()).toBe(true);
  });

  test('POST /auth/login retourne un jeton', { tag: ['@smoke', '@api', '@critical'] }, async ({ api }) => {
    await story('Parcours nominal');
    await severity(Severity.BLOCKER);

    const response = await api.post('/auth/login', {
      email: accounts.owner.email,
      password: accounts.owner.password,
    });

    expect(response.status()).toBe(200);
    const body = (await response.json()) as { token: string; user: { role: string } };
    expect(body.token).toBeTruthy();
    expect(body.user.role).toBe('owner');

    // Le mot de passe ne doit jamais transiter en retour.
    expect(await response.text()).not.toContain(accounts.owner.password);
  });

  test('POST /auth/login refuse un mauvais mot de passe', { tag: ['@regression', '@api'] }, async ({ api }) => {
    await story('Identifiants invalides');
    await severity(Severity.CRITICAL);

    const response = await api.post('/auth/login', {
      email: accounts.owner.email,
      password: 'MauvaisMotDePasse!',
    });
    expect(response.status()).toBe(401);
  });

  test('POST /auth/signup crée une organisation', { tag: ['@smoke', '@api', '@critical'] }, async ({ api }) => {
    await feature('Inscription');
    await story('Parcours nominal');
    await severity(Severity.BLOCKER);

    const payload = build.signup();
    const response = await api.post('/auth/signup', payload);

    expect(response.status()).toBe(201);
    const body = (await response.json()) as {
      id: string;
      role: string;
      organization: { name: string; plan: string };
    };
    expect(body.role).toBe('owner');
    expect(body.organization.plan).toBe('free');
    expect(body.organization.name).toBe(payload.company);
    expect(await response.text()).not.toContain(payload.password);
  });

  for (const [label, payload] of Object.entries(invalidSignups)) {
    test(`POST /auth/signup refuse une charge invalide : ${label}`, { tag: ['@regression', '@api'] }, async ({
      api,
    }) => {
      await feature('Inscription');
      await story('Validation');
      await severity(Severity.NORMAL);

      const response = await api.post('/auth/signup', payload);
      expect(response.status()).toBe(400);
      const error = (await response.json()) as { message?: string };
      expect(error.message).toBeTruthy();
    });
  }

  test('POST /auth/signup refuse un e-mail déjà utilisé', { tag: ['@regression', '@api'] }, async ({ api }) => {
    await feature('Inscription');
    await story('Validation');
    await severity(Severity.CRITICAL);

    const payload = build.signup();
    expect((await api.post('/auth/signup', payload)).status()).toBe(201);
    expect((await api.post('/auth/signup', payload)).status()).toBe(409);
  });

  test('POST /auth/signup refuse un nom trop long', { tag: ['@regression', '@api'] }, async ({ api }) => {
    await feature('Inscription');
    await story('Validation');
    await severity(Severity.MINOR);

    const response = await api.post('/auth/signup', build.signup({ company: build.oversizedString() }));
    expect([400, 413]).toContain(response.status());
  });

  test('un corps JSON malformé retourne 400', { tag: ['@regression', '@api'] }, async ({ api }) => {
    await story('Robustesse');
    await severity(Severity.NORMAL);

    const response = await api.post('/auth/signup', '{json invalide', {
      'Content-Type': 'application/json',
    });
    expect(response.status()).toBe(400);
  });
});
