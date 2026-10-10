import { expect, test } from '@playwright/test';
import { DEMO_PASSWORD, OWNER_EMAIL, SESSION_COOKIE, signIn, TEACHER_EMAIL, trackBffRequests } from './helpers';

test.describe('demo sign-in', () => {
  test('protected pages redirect to sign-in and keep the destination', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Demo sign-in \(simulated\)/ })).toBeVisible();
  });

  test('the root redirects to sign-in without a session', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('rejects a wrong password without revealing which field was wrong', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email / Mobile Number').fill(OWNER_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/login\?error=credentials$/);
    await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveText('Email or password is incorrect.');
  });

  test('signs in as the owner, returns to the requested page and signs out', async ({ page }) => {
    const bff = trackBffRequests(page);
    await signIn(page, OWNER_EMAIL, '/users');
    await expect(page.getByRole('heading', { level: 1, name: 'Users & Access' })).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link')).toHaveCount(27);

    await page.getByRole('button', { name: /Account menu for Ramesh Kumar/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login\?reason=signed_out$/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    expect(bff).toEqual([]);
  });

  test('the role switcher re-signs in as another role and navigation follows its grants', async ({ page }) => {
    await signIn(page, OWNER_EMAIL);
    await page.getByRole('button', { name: 'Demo mode: switch role' }).click();
    await page
      .getByRole('menuitem', { name: /Teacher/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\?switched=1$/);
    await expect(page.getByRole('button', { name: /Account menu for Rahul Mehra/ })).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Attendance' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Users & Access' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Fees & Finance' })).toHaveCount(0);
  });

  test('direct navigation to a module outside the role is denied by the server', async ({ page }) => {
    await signIn(page, TEACHER_EMAIL);
    for (const path of ['/users', '/fees', '/audit']) {
      await page.goto(path);
      await expect(page.getByText("You don't have access to this page")).toBeVisible();
      await expect(page.getByText(/Your role \(Teacher\) does not include/)).toBeVisible();
    }
  });

  test('unknown modules are not found', async ({ page }) => {
    await signIn(page, OWNER_EMAIL);
    const response = await page.goto('/platform-admin');
    expect(response?.status()).toBe(404);
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
    await expect(page.getByRole('status').first()).toHaveText('Your session has expired. Sign in again to continue.');
  });

  test('sign-in and role switch reject cross-origin posts', async ({ request }) => {
    const signInResponse = await request.post('/auth/sign-in', {
      headers: { origin: 'https://evil.example' },
      form: { email: OWNER_EMAIL, password: DEMO_PASSWORD },
      maxRedirects: 0,
    });
    expect(signInResponse.status()).toBe(303);
    expect(signInResponse.headers()['location']).toBe('/login?error=request');
    expect(signInResponse.headers()['set-cookie'] ?? '').not.toContain(`${SESSION_COOKIE}=`);

    const switchResponse = await request.post('/auth/switch-role', {
      headers: { origin: 'https://evil.example' },
      form: { roleId: 'owner' },
      maxRedirects: 0,
    });
    expect(switchResponse.status()).toBe(303);
    expect(switchResponse.headers()['set-cookie'] ?? '').not.toContain(`${SESSION_COOKIE}=`);
  });

  test('the role switch requires an existing session', async ({ request }) => {
    const response = await request.post('/auth/switch-role', {
      headers: { origin: 'http://localhost:3100' },
      form: { roleId: 'owner' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(303);
    expect(response.headers()['location']).toBe('/login');
    expect(response.headers()['set-cookie'] ?? '').not.toContain(`${SESSION_COOKIE}=`);
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
