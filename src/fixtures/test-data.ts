import { faker } from '@faker-js/faker';
import type { SignupPayload } from '../api/api-client.js';
import { env } from '../utils/env.js';

/** Comptes de référence par rôle — le contrôle d'accès est central en B2B. */
export const accounts = {
  owner: env.owner,
  admin: env.admin,
  member: env.member,
  wrongPassword: { email: env.owner.email, password: 'MauvaisMotDePasse!42' },
  unknownEmail: { email: 'inexistant-qa@example.invalid', password: env.owner.password },
} as const;

/** Plans et leurs limites de sièges — miroir du modèle de facturation. */
export const plans = {
  free: { id: 'free', label: 'Free', seats: 2 },
  pro: { id: 'pro', label: 'Pro', seats: 10 },
  business: { id: 'business', label: 'Business', seats: 50 },
} as const;

const slug = () => faker.string.alphanumeric(10).toLowerCase();

export const build = {
  /** Organisation isolée : chaque test mute son propre tenant. */
  signup(overrides: Partial<SignupPayload> = {}): SignupPayload {
    return {
      company: `${faker.company.name()} ${slug().slice(0, 4)}`,
      name: faker.person.fullName(),
      email: `qa-${slug()}@example.test`,
      password: `Aa1!${faker.string.alphanumeric(12)}`,
      ...overrides,
    };
  },

  email(): string {
    return `qa-${slug()}@example.test`;
  },

  oversizedString(length = 300): string {
    return 'A'.repeat(length);
  },
};

export const invalidSignups = {
  emptyBody: {},
  missingPassword: { company: 'Acme', name: 'Test', email: 'qa-missing@example.test' },
  shortPassword: { company: 'Acme', name: 'Test', email: 'qa-short@example.test', password: 'abc' },
  invalidEmail: { company: 'Acme', name: 'Test', email: 'pas-un-email', password: 'Aa1!validPass' },
} as const;
