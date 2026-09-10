import { test as base, expect as baseExpect } from '@playwright/test';
import { label, owner as allureOwner, parameter } from 'allure-js-commons';
import { LoginPage } from '../pages/login.page.js';
import { SignupPage } from '../pages/signup.page.js';
import { OnboardingPage } from '../pages/onboarding.page.js';
import { DashboardPage } from '../pages/dashboard.page.js';
import { TeamPage } from '../pages/team.page.js';
import { SubscriptionPage } from '../pages/subscription.page.js';
import { SettingsPage } from '../pages/settings.page.js';
import { NavigationComponent } from '../pages/navigation.component.js';
import { ApiClient } from '../api/api-client.js';
import { env } from '../utils/env.js';

interface Pages {
  loginPage: LoginPage;
  signupPage: SignupPage;
  onboardingPage: OnboardingPage;
  dashboardPage: DashboardPage;
  teamPage: TeamPage;
  subscriptionPage: SubscriptionPage;
  settingsPage: SettingsPage;
  navigation: NavigationComponent;
  api: ApiClient;
}

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
  signupPage: async ({ page }, use) => { await use(new SignupPage(page)); },
  onboardingPage: async ({ page }, use) => { await use(new OnboardingPage(page)); },
  dashboardPage: async ({ page }, use) => { await use(new DashboardPage(page)); },
  teamPage: async ({ page }, use) => { await use(new TeamPage(page)); },
  subscriptionPage: async ({ page }, use) => { await use(new SubscriptionPage(page)); },
  settingsPage: async ({ page }, use) => { await use(new SettingsPage(page)); },
  navigation: async ({ page }, use) => { await use(new NavigationComponent(page)); },

  api: async ({ request }, use) => {
    const client = new ApiClient(request);
    await use(client);
    await client.cleanup();
  },
});

test.beforeEach(async () => {
  await label('layer', 'e2e');
  await allureOwner('qa-team');
  await parameter('environnement', env.envName);
});

export const expect = baseExpect;
export { accounts, build, plans, invalidSignups } from './test-data.js';
