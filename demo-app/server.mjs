import express from 'express';
import * as store from './store.mjs';
import * as views from './views.mjs';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ strict: false }));

store.seed();

const SESSION_COOKIE = 'nimbus_session';

function parseCookies(req) {
  const header = req.headers.cookie ?? '';
  return Object.fromEntries(
    header
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf('=');
        return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
      }),
  );
}

function currentUser(req) {
  return store.getSession(parseCookies(req)[SESSION_COOKIE]);
}

function setSession(res, token, remember) {
  const parts = [`${SESSION_COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (remember) parts.push(`Max-Age=${60 * 60 * 24 * 30}`);
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.redirect(302, '/login');
  if (!user.onboarded && !req.path.startsWith('/onboarding')) return res.redirect(302, '/onboarding');
  req.user = user;
  req.org = store.getOrg(user.orgId);
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// Pages publiques
// ─────────────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.redirect(302, currentUser(req) ? '/dashboard' : '/login'));

app.get('/login', (req, res) => {
  if (currentUser(req)) return res.redirect(302, '/dashboard');
  res.send(views.loginPage({}));
});

app.post('/login', (req, res) => {
  const { email, password, remember } = req.body;
  const user = store.findUserByEmail(email);

  if (!user || user.password !== password) {
    // Message volontairement identique dans les deux cas : pas d'énumération.
    return res.status(401).send(
      views.loginPage({ error: 'Identifiants invalides. Vérifiez votre e-mail et votre mot de passe.', email }),
    );
  }
  if (user.status === 'locked') {
    return res.status(403).send(views.loginPage({ error: 'Ce compte est verrouillé.', email }));
  }

  setSession(res, store.createSession(user.id), Boolean(remember));
  res.redirect(302, user.onboarded ? '/dashboard' : '/onboarding');
});

app.get('/signup', (req, res) => res.send(views.signupPage({})));

app.post('/signup', (req, res) => {
  const { company, name, email, password } = req.body;

  if (!company || !name || !email || !password) {
    return res.status(400).send(views.signupPage({ error: 'Tous les champs sont requis.', values: req.body }));
  }
  if (String(password).length < 8) {
    return res
      .status(400)
      .send(views.signupPage({ error: 'Le mot de passe doit contenir au moins 8 caractères.', values: req.body }));
  }
  if (store.findUserByEmail(email)) {
    return res
      .status(409)
      .send(views.signupPage({ error: 'Un compte existe déjà avec cette adresse e-mail.', values: req.body }));
  }

  const org = store.createOrg({ name: company, plan: 'free' });
  const user = store.createUser({ orgId: org.id, name, email, password, role: 'owner' });
  setSession(res, store.createSession(user.id), false);
  res.redirect(302, '/onboarding');
});

app.post('/logout', (req, res) => {
  store.destroySession(parseCookies(req)[SESSION_COOKIE]);
  clearSession(res);
  res.redirect(302, '/login');
});

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding
// ─────────────────────────────────────────────────────────────────────────────

app.get('/onboarding', requireAuth, (req, res) => {
  if (req.user.onboarded) return res.redirect(302, '/dashboard');
  res.send(views.onboardingPage({ user: req.user, stepIndex: 0 }));
});

app.post('/onboarding/:step', requireAuth, (req, res) => {
  const step = Number(req.params.step);
  const isLast = step >= 2;

  if (step < 2 && !req.body.teamSize && !req.body.useCase) {
    return res
      .status(400)
      .send(views.onboardingPage({ user: req.user, stepIndex: step, error: 'Veuillez sélectionner une option.' }));
  }

  if (!isLast) {
    return res.send(views.onboardingPage({ user: req.user, stepIndex: step + 1 }));
  }

  if (req.body.invite) {
    const seats = store.seatUsage(req.user.orgId);
    if (seats.used < seats.limit) {
      store.createInvitation({
        orgId: req.user.orgId,
        email: req.body.invite,
        role: 'member',
        invitedBy: req.user.id,
      });
    }
  }

  req.user.onboarded = true;
  res.redirect(302, '/dashboard');
});

// ─────────────────────────────────────────────────────────────────────────────
// Application authentifiée
// ─────────────────────────────────────────────────────────────────────────────

app.get('/dashboard', requireAuth, (req, res) => {
  res.send(
    views.dashboardPage({ user: req.user, org: req.org, seats: store.seatUsage(req.user.orgId) }),
  );
});

app.get('/team', requireAuth, (req, res) => {
  res.send(
    views.teamPage({
      user: req.user,
      org: req.org,
      members: store.listMembers(req.user.orgId),
      invitations: store.listInvitations(req.user.orgId),
      seats: store.seatUsage(req.user.orgId),
    }),
  );
});

app.post('/team/invite', requireAuth, (req, res) => {
  const render = (extra) =>
    views.teamPage({
      user: req.user,
      org: req.org,
      members: store.listMembers(req.user.orgId),
      invitations: store.listInvitations(req.user.orgId),
      seats: store.seatUsage(req.user.orgId),
      ...extra,
    });

  if (req.user.role === 'member') {
    return res.status(403).send(render({ error: "Votre rôle ne permet pas d'inviter des membres." }));
  }

  const email = String(req.body.email ?? '').trim();
  if (!email) return res.status(400).send(render({ error: 'Adresse e-mail requise.' }));

  if (store.findUserByEmail(email) || store.findInvitation(req.user.orgId, email)) {
    return res.status(409).send(render({ error: 'Cette adresse est déjà membre ou déjà invitée.' }));
  }

  const seats = store.seatUsage(req.user.orgId);
  if (seats.used >= seats.limit) {
    return res.status(402).send(
      render({
        error: `Tous les sièges du plan ${seats.plan.label} sont utilisés. Passez à un plan supérieur pour inviter davantage de personnes.`,
      }),
    );
  }

  store.createInvitation({
    orgId: req.user.orgId,
    email,
    role: req.body.role === 'admin' ? 'admin' : 'member',
    invitedBy: req.user.id,
  });
  res.status(200).send(render({ notice: `Invitation envoyée à ${email}.` }));
});

app.post('/team/remove', requireAuth, (req, res) => {
  const render = (extra) =>
    views.teamPage({
      user: req.user,
      org: req.org,
      members: store.listMembers(req.user.orgId),
      invitations: store.listInvitations(req.user.orgId),
      seats: store.seatUsage(req.user.orgId),
      ...extra,
    });

  if (req.user.role !== 'owner') {
    return res.status(403).send(render({ error: 'Seul le propriétaire peut retirer un membre.' }));
  }
  const target = store.getUser(req.body.userId);
  if (!target || target.orgId !== req.user.orgId) {
    return res.status(404).send(render({ error: 'Membre introuvable.' }));
  }
  if (target.role === 'owner') {
    return res.status(400).send(render({ error: 'Le propriétaire ne peut pas être retiré.' }));
  }
  store.removeUser(target.id);
  res.send(render({ notice: `${target.name} a été retiré de l'organisation.` }));
});

app.get('/subscription', requireAuth, (req, res) => {
  res.send(
    views.subscriptionPage({ user: req.user, org: req.org, seats: store.seatUsage(req.user.orgId) }),
  );
});

app.post('/subscription', requireAuth, (req, res) => {
  const render = (extra) =>
    views.subscriptionPage({
      user: req.user,
      org: store.getOrg(req.user.orgId),
      seats: store.seatUsage(req.user.orgId),
      ...extra,
    });

  if (req.user.role !== 'owner') {
    return res.status(403).send(render({ error: "Seul le propriétaire peut modifier l'abonnement." }));
  }

  const result = store.changePlan(req.user.orgId, req.body.plan);
  if (!result.ok) {
    return res.status(409).send(render({ error: result.message ?? 'Changement de plan impossible.' }));
  }
  res.send(render({ notice: `Votre plan est désormais ${store.PLANS[req.body.plan].label}.` }));
});

app.get('/billing', requireAuth, (req, res) => {
  res.send(views.billingPage({ user: req.user, invoices: store.listInvoices(req.user.orgId) }));
});

app.get('/settings', requireAuth, (req, res) => {
  res.send(views.settingsPage({ user: req.user }));
});

app.post('/settings/profile', requireAuth, (req, res) => {
  const name = String(req.body.name ?? '').trim();
  if (!name) {
    return res.status(400).send(views.settingsPage({ user: req.user, error: 'Le nom ne peut pas être vide.' }));
  }
  req.user.name = name;
  res.send(views.settingsPage({ user: req.user, notice: 'Profil mis à jour.' }));
});

app.post('/settings/password', requireAuth, (req, res) => {
  const { current, next } = req.body;
  if (req.user.password !== current) {
    return res
      .status(400)
      .send(views.settingsPage({ user: req.user, error: 'Le mot de passe actuel est incorrect.' }));
  }
  if (String(next ?? '').length < 8) {
    return res
      .status(400)
      .send(views.settingsPage({ user: req.user, error: 'Le nouveau mot de passe est trop court.' }));
  }
  req.user.password = next;
  res.send(views.settingsPage({ user: req.user, notice: 'Mot de passe mis à jour.' }));
});

// ─────────────────────────────────────────────────────────────────────────────
// API REST
// ─────────────────────────────────────────────────────────────────────────────

const api = express.Router();

function bearerUser(req) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  return store.getSession(token);
}

function apiAuth(req, res, next) {
  const user = bearerUser(req);
  if (!user) return res.status(401).json({ message: 'Jeton manquant ou invalide.' });
  req.user = user;
  next();
}

api.get('/health', (_req, res) => res.json({ status: 'ok' }));

api.post('/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const user = store.findUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Identifiants invalides.' });
  }
  res.json({
    token: store.createSession(user.id),
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

api.post('/auth/signup', (req, res) => {
  const { company, name, email, password } = req.body ?? {};
  if (!company || !name || !email || !password) {
    return res.status(400).json({ message: 'Champs requis manquants : company, name, email, password.' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Mot de passe trop court (8 caractères minimum).' });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) {
    return res.status(400).json({ message: "Format d'e-mail invalide." });
  }
  if (String(company).length > 200) {
    return res.status(400).json({ message: "Nom d'organisation trop long." });
  }
  if (store.findUserByEmail(email)) {
    return res.status(409).json({ message: 'Cette adresse e-mail est déjà utilisée.' });
  }

  const org = store.createOrg({ name: company, plan: 'free' });
  const user = store.createUser({ orgId: org.id, name, email, password, role: 'owner', onboarded: true });
  res.status(201).json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organization: { id: org.id, name: org.name, plan: org.plan },
  });
});

api.get('/me', apiAuth, (req, res) => {
  const org = store.getOrg(req.user.orgId);
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role,
    organization: { id: org.id, name: org.name, plan: org.plan },
  });
});

api.get('/members', apiAuth, (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const all = store.listMembers(req.user.orgId).map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
  }));
  res.json({ data: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit });
});

api.get('/members/:id', apiAuth, (req, res) => {
  const member = store.getUser(req.params.id);
  if (!member || member.orgId !== req.user.orgId) {
    return res.status(404).json({ message: 'Membre introuvable.' });
  }
  res.json({ id: member.id, name: member.name, email: member.email, role: member.role });
});

api.post('/invitations', apiAuth, (req, res) => {
  if (req.user.role === 'member') {
    return res.status(403).json({ message: "Votre rôle ne permet pas d'inviter des membres." });
  }
  const email = String(req.body?.email ?? '').trim();
  if (!email) return res.status(400).json({ message: 'Champ requis manquant : email.' });
  if (store.findUserByEmail(email) || store.findInvitation(req.user.orgId, email)) {
    return res.status(409).json({ message: 'Adresse déjà membre ou déjà invitée.' });
  }

  const seats = store.seatUsage(req.user.orgId);
  if (seats.used >= seats.limit) {
    return res.status(402).json({
      message: `Limite de sièges atteinte pour le plan ${seats.plan.label}.`,
      code: 'seat_limit_reached',
      plan: seats.plan.id,
    });
  }

  const invitation = store.createInvitation({
    orgId: req.user.orgId,
    email,
    role: req.body?.role === 'admin' ? 'admin' : 'member',
    invitedBy: req.user.id,
  });
  res.status(201).json({ id: invitation.id, email: invitation.email, role: invitation.role, status: 'pending' });
});

api.get('/subscription', apiAuth, (req, res) => {
  const org = store.getOrg(req.user.orgId);
  const seats = store.seatUsage(req.user.orgId);
  res.json({ plan: org.plan, seatsUsed: seats.used, seatsLimit: seats.limit });
});

api.put('/subscription', apiAuth, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: "Seul le propriétaire peut modifier l'abonnement." });
  }
  const result = store.changePlan(req.user.orgId, req.body?.plan);
  if (!result.ok) {
    const status = result.error === 'plan_inconnu' ? 400 : 409;
    return res.status(status).json({ message: result.message ?? 'Changement impossible.', code: result.error });
  }
  res.json({ plan: result.org.plan });
});

api.delete('/members/:id', apiAuth, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Seul le propriétaire peut retirer un membre.' });
  }
  const member = store.getUser(req.params.id);
  if (!member || member.orgId !== req.user.orgId) {
    return res.status(404).json({ message: 'Membre introuvable.' });
  }
  store.removeUser(member.id);
  res.status(204).end();
});

/** Endpoint réservé aux tests : remet l'application dans un état connu. */
api.post('/test/reset', (_req, res) => {
  store.reset();
  res.json({ status: 'reset' });
});

app.use('/api', api);

// JSON malformé -> 400 plutôt qu'une 500.
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ message: 'Corps JSON malformé.' });
  }
  next(err);
});

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'Ressource introuvable.' });
  }
  res.status(404).send(views.notFoundPage());
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`Nimbus (app de démonstration) écoute sur http://localhost:${PORT}`);
});
