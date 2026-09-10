import type { Locator, Page } from '@playwright/test';
import { step } from 'allure-js-commons';

export type NavTarget = 'Dashboard' | 'Équipe' | 'Abonnement' | 'Facturation' | 'Paramètres';

export class NavigationComponent {
  readonly root: Locator;
  readonly burgerButton: Locator;
  readonly mobileNav: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('navigation', { name: /navigation principale/i });
    this.burgerButton = page.getByTestId('mobile-menu');
    this.mobileNav = page.getByTestId('mobile-nav');
  }

  link(target: NavTarget): Locator {
    return this.root.getByRole('link', { name: target, exact: true });
  }

  async goTo(target: NavTarget): Promise<void> {
    await step(`Naviguer vers ${target}`, async () => {
      await this.link(target).click();
    });
  }

  async openMobileMenu(): Promise<void> {
    await step('Ouvrir le menu mobile', async () => {
      await this.burgerButton.click();
    });
  }
}
