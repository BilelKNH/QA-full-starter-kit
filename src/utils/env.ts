import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Copiez .env.example vers .env et renseignez-la.`,
    );
  }
  return value;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Variable d'environnement ${name} doit être un nombre, reçu : "${raw}"`);
  }
  return parsed;
}

export const env = {
  baseURL: required('BASE_URL', 'http://localhost:3000'),
  apiURL: required('API_URL', 'http://localhost:3000/api'),

  /** Trois rôles : le contrôle d'accès est au cœur d'un produit B2B. */
  owner: {
    email: required('TEST_OWNER_EMAIL', 'owner@acme.test'),
    password: required('TEST_OWNER_PASSWORD', 'Passw0rd!'),
  },
  admin: {
    email: required('TEST_ADMIN_EMAIL', 'admin@acme.test'),
    password: required('TEST_ADMIN_PASSWORD', 'Passw0rd!'),
  },
  member: {
    email: required('TEST_MEMBER_EMAIL', 'member@acme.test'),
    password: required('TEST_MEMBER_PASSWORD', 'Passw0rd!'),
  },

  timeouts: {
    test: optionalNumber('TEST_TIMEOUT', 30_000),
    expect: optionalNumber('EXPECT_TIMEOUT', 5_000),
    action: optionalNumber('ACTION_TIMEOUT', 10_000),
    navigation: optionalNumber('NAVIGATION_TIMEOUT', 15_000),
    api: optionalNumber('API_TIMEOUT', 10_000),
  },

  isCI: !!process.env.CI,
  envName: process.env.TEST_ENV ?? 'local',
  /** Démarre l'app de démonstration automatiquement (désactiver pour viser une vraie app). */
  useDemoApp: process.env.USE_DEMO_APP !== 'false',
} as const;

export const STORAGE_STATE_OWNER = '.auth/owner.json';
export const STORAGE_STATE_ADMIN = '.auth/admin.json';
export const STORAGE_STATE_MEMBER = '.auth/member.json';
