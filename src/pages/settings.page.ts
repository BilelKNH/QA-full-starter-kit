import type { Locator, Page } from '@playwright/test';
import { step } from 'allure-js-commons';
import { BasePage } from './base.page.js';

export class SettingsPage extends BasePage {
  readonly nameInput: Locator;
  readonly saveProfileButton: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly updatePasswordButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page, '/settings');
    this.nameInput = page.getByLabel(/nom complet/i);
    this.saveProfileButton = page.getByRole('button', { name: /enregistrer/i });
    this.currentPasswordInput = page.getByLabel(/mot de passe actuel/i);
    this.newPasswordInput = page.getByLabel(/nouveau mot de passe/i);
    this.updatePasswordButton = page.getByRole('button', { name: /mettre à jour/i });
    this.errorMessage = page.getByRole('alert');
    this.successMessage = page.getByRole('status');
  }

  async updateName(name: string): Promise<void> {
    await step(`Modifier le nom en « ${name} »`, async () => {
      await this.nameInput.fill(name);
      await this.saveProfileButton.click();
    });
  }

  async changePassword(current: string, next: string): Promise<void> {
    await step('Changer le mot de passe', async () => {
      await this.currentPasswordInput.fill(current);
      await this.newPasswordInput.fill(next);
      await this.updatePasswordButton.click();
    });
  }
}
