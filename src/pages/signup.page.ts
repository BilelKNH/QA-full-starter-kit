import type { Locator, Page } from '@playwright/test';
import { step } from 'allure-js-commons';
import { BasePage } from './base.page.js';

export interface SignupData {
  company: string;
  name: string;
  email: string;
  password: string;
}

export class SignupPage extends BasePage {
  readonly companyInput: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page, '/signup');
    this.companyInput = page.getByLabel(/nom de l'organisation/i);
    this.nameInput = page.getByLabel(/votre nom/i);
    this.emailInput = page.getByLabel(/adresse e-?mail/i);
    this.passwordInput = page.getByLabel(/mot de passe/i);
    this.submitButton = page.getByRole('button', { name: /créer l'organisation/i });
    this.errorMessage = page.getByRole('alert');
  }

  async fillForm(data: SignupData): Promise<void> {
    await step("Remplir le formulaire de création d'organisation", async () => {
      await this.companyInput.fill(data.company);
      await this.nameInput.fill(data.name);
      await this.emailInput.fill(data.email);
      await this.passwordInput.fill(data.password);
    });
  }

  async submit(): Promise<void> {
    await step('Créer l\'organisation', async () => {
      await this.submitButton.click();
    });
  }

  async signup(data: SignupData): Promise<void> {
    await this.fillForm(data);
    await this.submit();
  }
}
