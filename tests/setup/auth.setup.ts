import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/login.page.js';
import { DashboardPage } from '../../src/pages/dashboard.page.js';
import {
  env,
  STORAGE_STATE_ADMIN,
  STORAGE_STATE_MEMBER,
  STORAGE_STATE_OWNER,
} from '../../src/utils/env.js';

/**
 * Une session persistée par rôle.
 *
 * En SaaS B2B, le contrôle d'accès est une fonctionnalité facturée : il faut
 * pouvoir rejouer le même parcours sous trois identités sans payer trois
 * connexions UI par test.
 */
const roles = [
  { name: 'owner', credentials: env.owner, file: STORAGE_STATE_OWNER },
  { name: 'admin', credentials: env.admin, file: STORAGE_STATE_ADMIN },
  { name: 'member', credentials: env.member, file: STORAGE_STATE_MEMBER },
] as const;

for (const role of roles) {
  setup(`authentifier le rôle ${role.name}`, async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login(role.credentials.email, role.credentials.password);

    await expect(page).toHaveURL(/dashboard/);
    await expect(dashboard.userMenu).toBeVisible();

    await page.context().storageState({ path: role.file });
  });
}
