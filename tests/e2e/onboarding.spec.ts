import { expect, test, type Page } from '@playwright/test';
import { OWNER_EMAIL, signIn, trackBffRequests } from './helpers';

const STRONG_PASSWORD = 'Sunrise#Campus26';

async function openOwnerInvitation(page: Page) {
  await page.goto('/demo/inbox');
  await expect(page.getByRole('heading', { name: 'Simulated email inbox' })).toBeVisible();
  await expect(page.getByText(/No email has been sent to anyone/)).toBeVisible();
  await page.getByRole('link', { name: /set up your administrator account/ }).click();
  await expect(page.getByRole('heading', { name: /set up your administrator account/ })).toBeVisible();
  await expect(page.getByText('Ramesh Kumar <ramesh.kumar@greenwood.edu.in>')).toBeVisible();
  await page.getByRole('link', { name: 'Set up your account' }).click();
  await expect(page).toHaveURL(/\/invite\/inv_/);
}

test.describe('simulated owner onboarding', () => {
  test('invitation email → password setup with policy checks → success → sign in', async ({ page }) => {
    const bff = trackBffRequests(page);
    await openOwnerInvitation(page);
    const inviteUrl = page.url();
    await expect(page.getByRole('heading', { name: 'Set up your owner account' })).toBeVisible();
    await expect(page.getByText(/no real account is created/)).toBeVisible();

    await page.getByLabel('New password').fill('weak');
    await page.getByLabel('Confirm password').fill('different');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(/Password needs:/)).toBeVisible();
    await expect(page.getByText('Passwords do not match.')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'One uppercase letter' })).toContainText('(not met)');

    await page.getByLabel('New password').fill(STRONG_PASSWORD);
    await page.getByLabel('Confirm password').fill(STRONG_PASSWORD);
    await expect(page.getByRole('listitem').filter({ hasText: 'One special character' })).toContainText('(met)');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('heading', { name: 'Account setup complete' })).toBeVisible();
    await expect(page.getByText(/No password was saved and no real account exists/)).toBeVisible();
    await page.getByRole('link', { name: 'Continue to sign in' }).click();
    await expect(page).toHaveURL(/\/login\?reason=setup_complete$/);
    await expect(page.getByRole('status').first()).toContainText('Demo account setup is complete');

    await page.goto(inviteUrl);
    await expect(page.getByRole('heading', { name: 'This invitation was already used' })).toBeVisible();

    const stored = await page.evaluate(() => window.localStorage.getItem('edulynk-erp-demo:v2') ?? '');
    expect(stored).toContain('invitation.accepted');
    expect(stored).not.toContain(STRONG_PASSWORD);
    expect(bff).toEqual([]);
  });

  test('an unknown invitation token shows the invalid state', async ({ page }) => {
    await page.goto('/invite/inv_not_a_real_token');
    await expect(page.getByRole('heading', { name: 'This link is not valid' })).toBeVisible();
  });

  test('the owner can sign in while setup is pending, and the dashboard shows the demo badge', async ({ page }) => {
    await signIn(page, OWNER_EMAIL);
    await expect(page.getByRole('button', { name: 'Demo mode: switch role' })).toBeVisible();
    await expect(page.getByText(/Demo mode: simulated data and sign-in/)).toBeVisible();
  });
});

test.describe('simulated password recovery', () => {
  test('forgot password → reset link sent → inbox → reset → used link', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();

    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('Enter your email address.')).toBeVisible();

    await page.getByLabel('Email address').fill('anil.mehta@greenwood.edu.in');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await expect(page.getByText('No email was sent.', { exact: false })).toBeVisible();

    await page.getByRole('link', { name: 'Open simulated inbox' }).click();
    await page
      .getByRole('link', { name: /Reset your Edulynk ERP password/ })
      .first()
      .click();
    await page.getByRole('link', { name: 'Reset password' }).click();
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    const resetUrl = page.url();

    await page.getByLabel('New password').fill(STRONG_PASSWORD);
    await page.getByLabel('Confirm password').fill(STRONG_PASSWORD);
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByRole('heading', { name: 'Password reset complete' })).toBeVisible();

    await page.goto(resetUrl);
    await expect(page.getByRole('heading', { name: 'This reset link was already used' })).toBeVisible();
  });

  test('an unknown address gets the same confirmation (no account enumeration)', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email address').fill('nobody@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  });

  test('a reset link expires after 30 minutes', async ({ page }) => {
    await page.clock.install({ time: new Date() });
    await page.goto('/forgot-password');
    await page.getByLabel('Email address').fill('meena.reddy@greenwood.edu.in');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

    await page.goto('/demo/inbox');
    await page
      .getByRole('link', { name: /Reset your Edulynk ERP password/ })
      .first()
      .click();
    const href = await page.getByRole('link', { name: 'Reset password' }).getAttribute('href');
    await page.clock.fastForward('31:00');
    await page.goto(href!);
    await expect(page.getByRole('heading', { name: 'This reset link has expired' })).toBeVisible();
  });
});
