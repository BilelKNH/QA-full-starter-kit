import type { APIRequestContext, APIResponse } from '@playwright/test';
import { attachment, step } from 'allure-js-commons';
import { env } from '../utils/env.js';

export interface SignupPayload {
  company: string;
  name: string;
  email: string;
  password: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SubscriptionState {
  plan: 'free' | 'pro' | 'business';
  seatsUsed: number;
  seatsLimit: number;
}

/**
 * Client de l'API Nimbus.
 *
 * Porte trois responsabilités au-delà de l'appel HTTP :
 *  1. gestion du jeton de session (login puis en-tête Authorization)
 *  2. traçage de chaque échange dans le rapport Allure
 *  3. suppression des ressources créées, en teardown de la fixture
 */
export class ApiClient {
  private token: string | null = null;
  private readonly createdMemberIds: string[] = [];

  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string = env.apiURL,
  ) {}

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...extra,
    };
  }

  private async trace(name: string, response: APIResponse): Promise<void> {
    const body = await response.text().catch(() => '<corps illisible>');
    await attachment(`${name} — ${response.status()}`, body.slice(0, 20_000), 'application/json');
  }

  /** Authentifie le client ; le jeton est ensuite envoyé automatiquement. */
  async loginAs(email: string, password: string): Promise<string> {
    return step(`Authentifier ${email}`, async () => {
      const response = await this.request.post(this.url('/auth/login'), {
        data: { email, password },
        timeout: env.timeouts.api,
        failOnStatusCode: false,
      });
      await this.trace('POST /auth/login', response);
      if (response.status() !== 200) {
        throw new Error(`Authentification échouée pour ${email} (HTTP ${response.status()})`);
      }
      const body = (await response.json()) as { token: string };
      this.token = body.token;
      return body.token;
    });
  }

  withoutToken(): this {
    this.token = null;
    return this;
  }

  async get(path: string, params?: Record<string, string | number | boolean>): Promise<APIResponse> {
    return step(`GET ${path}`, async () => {
      const response = await this.request.get(this.url(path), {
        params,
        headers: this.headers(),
        timeout: env.timeouts.api,
        failOnStatusCode: false,
      });
      await this.trace(`GET ${path}`, response);
      return response;
    });
  }

  async post(path: string, data: unknown, extraHeaders?: Record<string, string>): Promise<APIResponse> {
    return step(`POST ${path}`, async () => {
      const response = await this.request.post(this.url(path), {
        data: data as Record<string, unknown>,
        headers: this.headers(extraHeaders),
        timeout: env.timeouts.api,
        failOnStatusCode: false,
      });
      await this.trace(`POST ${path}`, response);
      return response;
    });
  }

  async put(path: string, data: unknown): Promise<APIResponse> {
    return step(`PUT ${path}`, async () => {
      const response = await this.request.put(this.url(path), {
        data: data as Record<string, unknown>,
        headers: this.headers(),
        timeout: env.timeouts.api,
        failOnStatusCode: false,
      });
      await this.trace(`PUT ${path}`, response);
      return response;
    });
  }

  async delete(path: string, extraHeaders?: Record<string, string>): Promise<APIResponse> {
    return step(`DELETE ${path}`, async () => {
      const response = await this.request.delete(this.url(path), {
        headers: this.headers(extraHeaders),
        timeout: env.timeouts.api,
        failOnStatusCode: false,
      });
      await this.trace(`DELETE ${path}`, response);
      return response;
    });
  }

  /**
   * Crée une organisation isolée et s'y authentifie.
   * Chaque test qui mute des données travaille ainsi dans son propre tenant :
   * la suite reste parallélisable sans collision.
   */
  async signupAndLogin(payload: SignupPayload): Promise<{ member: Member; token: string }> {
    const response = await this.post('/auth/signup', payload);
    if (response.status() !== 201) {
      throw new Error(`Création d'organisation échouée (HTTP ${response.status()})`);
    }
    const member = (await response.json()) as Member;
    this.createdMemberIds.push(member.id);
    const token = await this.loginAs(payload.email, payload.password);
    return { member, token };
  }

  async cleanup(): Promise<void> {
    if (this.createdMemberIds.length === 0) return;
    await step(`Nettoyer ${this.createdMemberIds.length} ressource(s)`, async () => {
      for (const id of this.createdMemberIds) {
        await this.request
          .delete(this.url(`/members/${id}`), { headers: this.headers(), failOnStatusCode: false })
          .catch(() => undefined);
      }
      this.createdMemberIds.length = 0;
    });
  }
}
