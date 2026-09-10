import { randomUUID } from 'node:crypto';

/**
 * Magasin en mémoire de l'application de démonstration.
 *
 * Volontairement simple : l'application n'est pas le produit, c'est la cible
 * de test. Elle existe pour que la suite Playwright s'exécute réellement,
 * de façon déterministe et hors ligne.
 */

export const PLANS = {
  free: { id: 'free', label: 'Free', seats: 2, priceMonthly: 0 },
  pro: { id: 'pro', label: 'Pro', seats: 10, priceMonthly: 49 },
  business: { id: 'business', label: 'Business', seats: 50, priceMonthly: 199 },
};

export const ROLES = ['owner', 'admin', 'member'];

const db = {
  orgs: new Map(),
  users: new Map(),
  sessions: new Map(),
  invitations: new Map(),
  invoices: new Map(),
};

const uid = (prefix) => `${prefix}_${randomUUID().slice(0, 12)}`;

export function reset() {
  db.orgs.clear();
  db.users.clear();
  db.sessions.clear();
  db.invitations.clear();
  db.invoices.clear();
  seed();
}

/** Compte de référence, utilisé par le setup d'authentification. */
export function seed() {
  const org = createOrg({ name: 'Acme Analytics', plan: 'pro' });
  const owner = createUser({
    orgId: org.id,
    name: 'Nadia Owner',
    email: 'owner@acme.test',
    password: 'Passw0rd!',
    role: 'owner',
    onboarded: true,
  });
  createUser({
    orgId: org.id,
    name: 'Marc Admin',
    email: 'admin@acme.test',
    password: 'Passw0rd!',
    role: 'admin',
    onboarded: true,
  });
  createUser({
    orgId: org.id,
    name: 'Lina Member',
    email: 'member@acme.test',
    password: 'Passw0rd!',
    role: 'member',
    onboarded: true,
  });

  for (let i = 0; i < 3; i += 1) {
    const invoice = {
      id: uid('inv'),
      orgId: org.id,
      number: `AC-2026-00${i + 1}`,
      amount: PLANS.pro.priceMonthly,
      status: i === 0 ? 'due' : 'paid',
      issuedAt: `2026-0${i + 4}-01`,
    };
    db.invoices.set(invoice.id, invoice);
  }

  return { org, owner };
}

export function createOrg({ name, plan = 'free' }) {
  const org = { id: uid('org'), name, plan, createdAt: new Date().toISOString() };
  db.orgs.set(org.id, org);
  return org;
}

export function getOrg(orgId) {
  return db.orgs.get(orgId) ?? null;
}

export function createUser({ orgId, name, email, password, role = 'member', onboarded = false }) {
  const user = {
    id: uid('usr'),
    orgId,
    name,
    email: email.toLowerCase(),
    password,
    role,
    onboarded,
    status: 'active',
    failedLogins: 0,
    createdAt: new Date().toISOString(),
  };
  db.users.set(user.id, user);
  return user;
}

export function findUserByEmail(email) {
  if (!email) return null;
  const needle = String(email).toLowerCase();
  for (const user of db.users.values()) {
    if (user.email === needle) return user;
  }
  return null;
}

export function getUser(userId) {
  return db.users.get(userId) ?? null;
}

export function listMembers(orgId) {
  return [...db.users.values()]
    .filter((u) => u.orgId === orgId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function removeUser(userId) {
  return db.users.delete(userId);
}

export function seatUsage(orgId) {
  const org = getOrg(orgId);
  const plan = PLANS[org?.plan ?? 'free'];
  const used = listMembers(orgId).length + countPendingInvitations(orgId);
  return { used, limit: plan.seats, plan };
}

export function createInvitation({ orgId, email, role, invitedBy }) {
  const invitation = {
    id: uid('inv'),
    orgId,
    email: email.toLowerCase(),
    role,
    invitedBy,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  db.invitations.set(invitation.id, invitation);
  return invitation;
}

export function listInvitations(orgId) {
  return [...db.invitations.values()].filter((i) => i.orgId === orgId && i.status === 'pending');
}

export function countPendingInvitations(orgId) {
  return listInvitations(orgId).length;
}

export function findInvitation(orgId, email) {
  return (
    [...db.invitations.values()].find(
      (i) => i.orgId === orgId && i.email === String(email).toLowerCase() && i.status === 'pending',
    ) ?? null
  );
}

export function revokeInvitation(id) {
  const invitation = db.invitations.get(id);
  if (!invitation) return false;
  invitation.status = 'revoked';
  return true;
}

export function listInvoices(orgId) {
  return [...db.invoices.values()]
    .filter((i) => i.orgId === orgId)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export function changePlan(orgId, planId) {
  const org = getOrg(orgId);
  if (!org) return { ok: false, error: 'organisation_introuvable' };
  const plan = PLANS[planId];
  if (!plan) return { ok: false, error: 'plan_inconnu' };

  const membersAndInvites = listMembers(orgId).length + countPendingInvitations(orgId);
  if (membersAndInvites > plan.seats) {
    return {
      ok: false,
      error: 'sieges_insuffisants',
      message: `Le plan ${plan.label} est limité à ${plan.seats} sièges, votre organisation en utilise ${membersAndInvites}.`,
    };
  }

  org.plan = planId;
  const invoice = {
    id: uid('inv'),
    orgId,
    number: `AC-2026-${String(db.invoices.size + 1).padStart(3, '0')}`,
    amount: plan.priceMonthly,
    status: 'due',
    issuedAt: new Date().toISOString().slice(0, 10),
  };
  db.invoices.set(invoice.id, invoice);
  return { ok: true, org, invoice };
}

export function createSession(userId) {
  const token = uid('ses');
  db.sessions.set(token, { userId, createdAt: Date.now() });
  return token;
}

export function getSession(token) {
  if (!token) return null;
  const session = db.sessions.get(token);
  if (!session) return null;
  return getUser(session.userId);
}

export function destroySession(token) {
  return db.sessions.delete(token);
}

export const helpers = { uid };
