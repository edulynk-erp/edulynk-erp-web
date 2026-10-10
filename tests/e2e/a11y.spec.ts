import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { OWNER_EMAIL, signIn, TEACHER_EMAIL } from './helpers';

async function expectAccessible(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(
    results.violations.map(
      (violation) =>
        `${violation.id} (${violation.nodes.length}): ${violation.help} :: ${violation.nodes
          .map((node) => `${node.target.join(' ')} → ${node.failureSummary?.replace(/\s+/g, ' ')}`)
          .join(' | ')}`,
    ),
    label,
  ).toEqual([]);
}

test.describe('accessibility (axe, WCAG 2.1 AA)', () => {
  test('sign-in page', async ({ page }) => {
    await page.goto('/login');
    await expectAccessible(page, 'login');
  });

  test('not-found page', async ({ page }) => {
    await page.goto('/login/does-not-exist');
    await expectAccessible(page, 'not found');
  });

  test('simulated onboarding pages', async ({ page }) => {
    await page.goto('/demo/inbox');
    await expect(page.getByRole('link', { name: /set up your administrator account/ })).toBeVisible();
    await expectAccessible(page, 'inbox');
    await page.getByRole('link', { name: /set up your administrator account/ }).click();
    await expect(page.getByRole('link', { name: 'Set up your account' })).toBeVisible();
    await expectAccessible(page, 'email');
    await page.getByRole('link', { name: 'Set up your account' }).click();
    await expect(page.getByRole('heading', { name: 'Set up your owner account' })).toBeVisible();
    await expectAccessible(page, 'set password');
    await page.goto('/forgot-password');
    await expectAccessible(page, 'forgot password');
  });

  test('signed-in shell, module page and access denied', async ({ page }) => {
    await signIn(page, OWNER_EMAIL);
    await page.goto('/attendance');
    await expect(page.getByRole('heading', { level: 1, name: 'Attendance' })).toBeVisible();
    await expectAccessible(page, 'module page');

    await page.context().clearCookies();
    await signIn(page, TEACHER_EMAIL);
    await page.goto('/users');
    await expect(page.getByText("You don't have access to this page")).toBeVisible();
    await expectAccessible(page, 'access denied');
  });
});
