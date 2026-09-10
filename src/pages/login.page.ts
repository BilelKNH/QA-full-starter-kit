import type { Locator, Page } from '@playwright/test';
import { step } from 'allure-js-commons';
import { BasePage } from './base.page.js';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly signupLink: Locator;

  constructor(page: Page) {
    super(page, '/login');
    this.emailInput = page.getByLabel(/adresse e-?mail/i);
    this.passwordInput = page.getByLabel(/mot de passe/i);
    this.rememberMeCheckbox = page.getByRole('checkbox', { name: /se souvenir/i });
    this.submitButton = page.getByRole('button', { name: /se connecter/i });
    this.errorMessage = page.getByRole('alert');
    this.signupLink = page.getByRole('link', { name: /créer une organisation/i });
  }

  async fillCredentials(email: string, password: string): Promise<void> {
    await step(`Saisir les identifiants (${email || '<vide>'})`, async () => {
      if (email) await this.emailInput.fill(email);
      if (password) await this.passwordInput.fill(password);
    });
  }

  async submit(): Promise<void> {
    await step('Soumettre le formulaire de connexion', async () => {
      await this.submitButton.click();
    });
  }

  async login(email: string, password: string, rememberMe = false): Promise<void> {
    await step(`Se connecter en tant que ${email}`, async () => {
      await this.fillCredentials(email, password);
      if (rememberMe) await this.rememberMeCheckbox.check();
      await this.submit();
    });
  }

  async isFieldNativelyInvalid(field: 'email' | 'password'): Promise<boolean> {
    const locator = field === 'email' ? this.emailInput : this.passwordInput;
    return locator.evaluate((el) => !(el as HTMLInputElement).validity.valid);
  }
}
