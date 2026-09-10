import { defineConfig, devices } from '@playwright/test';
import { env, STORAGE_STATE_OWNER } from './src/utils/env.js';
import { allureCategories } from './allure-config/categories.js';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',

  timeout: env.timeouts.test,
  expect: { timeout: env.timeouts.expect },

  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.isCI ? 2 : 0,
  workers: env.isCI ? 2 : undefined,

  /**
   * L'application de démonstration est démarrée automatiquement.
   * Pour viser une vraie application : USE_DEMO_APP=false + BASE_URL/API_URL.
   */
  ...(env.useDemoApp
    ? {
        webServer: {
          command: 'node demo-app/server.mjs',
          url: 'http://localhost:3000/api/health',
          reuseExistingServer: !env.isCI,
          timeout: 30_000,
          stdout: 'ignore' as const,
        },
      }
    : {}),

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true,
        suiteTitle: false,
        categories: allureCategories,
        environmentInfo: {
          environnement: env.envName,
          base_url: env.baseURL,
          api_url: env.apiURL,
          cible: env.useDemoApp ? 'app de démonstration (Nimbus)' : 'application externe',
          node: process.version,
          ci: String(env.isCI),
        },
        links: {
          issue: {
            urlTemplate: (v: string) => `https://votre-tracker/browse/${v}`,
            nameTemplate: (v: string) => `Ticket ${v}`,
          },
          tms: { urlTemplate: (v: string) => `https://votre-tms/case/${v}` },
        },
      },
    ],
  ],

  use: {
    baseURL: env.baseURL,
    actionTimeout: env.timeouts.action,
    navigationTimeout: env.timeouts.navigation,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /tests\/setup\/.*\.setup\.ts/,
    },
    {
      name: 'api',
      testMatch: /tests\/api\/.*\.spec\.ts/,
      use: { baseURL: env.apiURL },
    },
    {
      name: 'e2e-chromium',
      testMatch: /tests\/e2e\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE_OWNER },
    },
  ],
});
