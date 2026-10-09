import { expect, test } from '@playwright/test';
import { SESSION_COOKIE } from './helpers';

test.describe('tenant-realm sign-in (unconfigured)', () => {
  test('protected pages redirect to sign-in and keep the destination', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    await expect(page.getByRole('heading', { name: 'Edulynk' })).toBeVisible();
    await expect(page.getByText(/Sign-in is not configured/)).toBeVisible();
  });

  test('the root redirects to sign-in without a session', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('a forged session cookie is treated as expired', async ({ page, request }) => {
    const response = await request.get('/dashboard', {
      headers: { cookie: `${SESSION_COOKIE}=forged` },
      maxRedirects: 0,
    });
    expect([303, 307]).toContain(response.status());
    const location = response.headers()['location'] ?? '';
    expect(location).toMatch(/reason=session_expired/);
    await page.goto(location);
    await expect(page.getByRole('status')).toHaveText('Your session has expired. Sign in again to continue.');
  });

  test('sign-out clears the session cookie', async ({ request }) => {
    const response = await request.post('/auth/logout', {
      headers: { origin: 'http://localhost:3100' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(303);
    expect(response.headers()['location']).toContain('/login?reason=signed_out');
    expect(response.headers()['set-cookie']).toContain(`${SESSION_COOKIE}=;`);
  });
});
