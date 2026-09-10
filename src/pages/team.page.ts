import type { Locator, Page } from '@playwright/test';
import { step } from 'allure-js-commons';
import { BasePage } from './base.page.js';

export type MemberRole = 'member' | 'admin';

/** Gestion d'équipe et de sièges — cœur du modèle de revenu en SaaS B2B. */
export class TeamPage extends BasePage {
  readonly memberRows: Locator;
  readonly invitationRows: Locator;
  readonly seatUsage: Locator;
  readonly inviteEmailInput: Locator;
  readonly inviteRoleSelect: Locator;
  readonly inviteButton: Locator;
  readonly seatsExhaustedBanner: Locator;
  readonly inviteForbidden: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page, '/team');
    this.memberRows = page.getByTestId('member-row');
    this.invitationRows = page.getByTestId('invitation-row');
    this.seatUsage = page.getByTestId('seat-usage');
    this.inviteEmailInput = page.getByLabel(/adresse e-?mail/i);
    this.inviteRoleSelect = page.getByLabel(/rôle/i);
    this.inviteButton = page.getByRole('button', { name: /envoyer l'invitation/i });
    this.seatsExhaustedBanner = page.getByTestId('seats-exhausted');
    this.inviteForbidden = page.getByTestId('invite-forbidden');
    this.errorMessage = page.getByRole('alert');
    this.successMessage = page.getByRole('status');
  }

  async invite(email: string, role: MemberRole = 'member'): Promise<void> {
    await step(`Inviter ${email} en tant que ${role}`, async () => {
      await this.inviteEmailInput.fill(email);
      await this.inviteRoleSelect.selectOption(role);
      await this.inviteButton.click();
    });
  }

  removeButtonFor(name: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`retirer ${name}`, 'i') });
  }

  async removeMember(name: string): Promise<void> {
    await step(`Retirer ${name} de l'organisation`, async () => {
      await this.removeButtonFor(name).click();
    });
  }

  async memberCount(): Promise<number> {
    return this.memberRows.count();
  }
}
