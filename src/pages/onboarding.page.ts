import type { Locator, Page } from '@playwright/test';
import { step } from 'allure-js-commons';
import { BasePage } from './base.page.js';

/** Assistant d'onboarding en 3 étapes — parcours d'activation classique en SaaS. */
export class OnboardingPage extends BasePage {
  readonly progress: Locator;
  readonly teamSizeSelect: Locator;
  readonly useCaseSelect: Locator;
  readonly inviteInput: Locator;
  readonly continueButton: Locator;
  readonly finishButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page, '/onboarding');
    this.progress = page.getByTestId('onboarding-progress');
    this.teamSizeSelect = page.getByLabel(/combien de personnes/i);
    this.useCaseSelect = page.getByLabel(/cas d'usage/i);
    this.inviteInput = page.getByLabel(/adresse e-?mail d'un collègue/i);
    this.continueButton = page.getByRole('button', { name: /continuer/i });
    this.finishButton = page.getByRole('button', { name: /terminer/i });
    this.errorMessage = page.getByRole('alert');
  }

  async completeStepTeamSize(value: '1-5' | '6-20' | '20+'): Promise<void> {
    await step(`Étape 1 — taille d'équipe : ${value}`, async () => {
      await this.teamSizeSelect.selectOption(value);
      await this.continueButton.click();
    });
  }

  async completeStepUseCase(value: 'analytics' | 'reporting' | 'monitoring'): Promise<void> {
    await step(`Étape 2 — cas d'usage : ${value}`, async () => {
      await this.useCaseSelect.selectOption(value);
      await this.continueButton.click();
    });
  }

  async completeStepInvite(email?: string): Promise<void> {
    await step(`Étape 3 — invitation${email ? ` de ${email}` : ' ignorée'}`, async () => {
      if (email) await this.inviteInput.fill(email);
      await this.finishButton.click();
    });
  }

  /** Parcours d'activation complet. */
  async completeAll(inviteEmail?: string): Promise<void> {
    await this.completeStepTeamSize('6-20');
    await this.completeStepUseCase('analytics');
    await this.completeStepInvite(inviteEmail);
  }
}
