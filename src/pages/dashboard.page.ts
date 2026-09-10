import type { Locator, Page } from '@playwright/test';
import { step } from 'allure-js-commons';
import { BasePage } from './base.page.js';

export class DashboardPage extends BasePage {
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly heading: Locator;
  readonly currentPlan: Locator;
  readonly seatUsage: Locator;

  constructor(page: Page) {
    super(page, '/dashboard');
    this.userMenu = page.getByTestId('user-menu');
    this.logoutButton = page.getByTestId('logout-button');
    this.heading = page.getByRole('heading', { level: 1 });
    this.currentPlan = page.getByTestId('current-plan');
    this.seatUsage = page.getByTestId('seat-usage');
  }

  async logout(): Promise<void> {
    await step('Se déconnecter', async () => {
      await this.logoutButton.click();
    });
  }

  async sessionCookies(): Promise<string[]> {
    const cookies = await this.page.context().cookies();
    return cookies.filter((c) => /session|token|jwt|auth/i.test(c.name)).map((c) => c.name);
  }
}
