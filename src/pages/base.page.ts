import type { Page, Response } from '@playwright/test';
import { step } from 'allure-js-commons';

/**
 * Classe de base de tous les Page Objects.
 *
 * Règles de conception appliquées dans tout le kit :
 *  - un Page Object expose des *locators* et des *actions métier*, jamais d'assertions
 *  - aucun `waitForTimeout` : on s'appuie sur l'auto-waiting de Playwright
 *  - tous les locators sont construits une seule fois, dans le constructeur
 */
export abstract class BasePage {
  protected constructor(
    protected readonly page: Page,
    /** Chemin relatif à `baseURL`, ex. `/login`. */
    protected readonly path: string,
  ) {}

  /** Ouvre la page et attend que le DOM soit prêt. */
  async goto(): Promise<Response | null> {
    return step(`Ouvrir ${this.path}`, async () => {
      return this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    });
  }

  get url(): string {
    return this.page.url();
  }

  async title(): Promise<string> {
    return this.page.title();
  }

  /**
   * Attend la fin des requêtes réseau déclenchées par une action.
   * Préférer un locator explicite quand c'est possible ; ce helper est
   * un filet de sécurité pour les cas de navigation lourde.
   */
  protected async waitForIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /** Capture attachée au rapport Allure via le reporter Playwright. */
  async screenshot(name: string): Promise<Buffer> {
    return this.page.screenshot({ path: undefined, fullPage: true }).then((buffer) => {
      void name;
      return buffer;
    });
  }
}
