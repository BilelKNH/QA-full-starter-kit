import type { Locator, Page } from '@playwright/test';
import { step } from 'allure-js-commons';
import { BasePage } from './base.page.js';

export type PlanId = 'free' | 'pro' | 'business';

export class SubscriptionPage extends BasePage {
  readonly seatUsage: Locator;
  readonly currentBadge: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly forbiddenNotice: Locator;

  constructor(page: Page) {
    super(page, '/subscription');
    this.seatUsage = page.getByTestId('seat-usage');
    this.currentBadge = page.getByTestId('plan-current-badge');
    this.errorMessage = page.getByRole('alert');
    this.successMessage = page.getByRole('status');
    this.forbiddenNotice = page.getByTestId('billing-forbidden');
  }

  planCard(plan: PlanId): Locator {
    return this.page.getByTestId(`plan-${plan}`);
  }

  async switchTo(plan: PlanId): Promise<void> {
    await step(`Basculer sur le plan ${plan}`, async () => {
      await this.planCard(plan).getByRole('button').click();
    });
  }

  async currentPlan(): Promise<PlanId> {
    for (const plan of ['free', 'pro', 'business'] as const) {
      const card = this.planCard(plan);
      if (await card.getByTestId('plan-current-badge').isVisible().catch(() => false)) return plan;
    }
    throw new Error('Aucun plan courant identifié sur la page abonnement.');
  }
}
