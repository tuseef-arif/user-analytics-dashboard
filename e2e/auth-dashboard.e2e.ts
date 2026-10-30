import { expect, test } from '@playwright/test';

import {
  PASSWORD,
  genderRow,
  readGenderCount,
  readTotal,
  registerViaApi,
  signUpAndLogIn,
  uniqueUsername,
} from './helpers';

const COOKIE = 'access_token';

test.describe('logged out', () => {
  test('protected and root paths redirect to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('/login and /register render', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.getByRole('heading', { name: 'Sign in', level: 1 }),
    ).toBeVisible();
    await page.goto('/register');
    await expect(
      page.getByRole('heading', { name: 'Sign up', level: 1 }),
    ).toBeVisible();
  });

  test('the API rejects unauthenticated requests', async ({ request }) => {
    expect((await request.get('/api/dashboard/stats')).status()).toBe(401);
    expect((await request.get('/api/auth/me')).status()).toBe(401);
  });
});

test.describe('register', () => {
  test('a new account lands on /login with a notice', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Username').fill(uniqueUsername());
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Gender').selectOption('other');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL('/login?registered=1');
    await expect(page.getByRole('status')).toHaveText(
      'Account created. Please sign in.',
    );
  });

  test('an empty submit shows field errors without calling the API', async ({
    page,
  }) => {
    let registerCalls = 0;
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/auth/register') {
        registerCalls += 1;
      }
    });
    await page.goto('/register');

    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Username is required.')).toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();
    await expect(page.getByText('Please select a gender.')).toBeVisible();
    await expect(page.getByLabel('Username')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page).toHaveURL('/register');
    expect(registerCalls).toBe(0);
  });

  test('a taken username is reported on the username field', async ({
    page,
    request,
  }) => {
    const username = uniqueUsername();
    await registerViaApi(request, username);
    await page.goto('/register');

    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Gender').selectOption('male');
    await page.getByRole('button', { name: 'Create Account' }).click();

    const usernameInput = page.getByLabel('Username');
    await expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
    await expect(usernameInput).toHaveAccessibleDescription(
      'Username already taken',
    );
    await expect(page).toHaveURL('/register');
  });
});

test.describe('login failures', () => {
  test('a wrong password and an unknown user get the same alert', async ({
    page,
    request,
  }) => {
    const username = uniqueUsername();
    await registerViaApi(request, username);

    for (const [name, password] of [
      [username, 'WrongPassword1!'],
      [uniqueUsername(), PASSWORD],
    ]) {
      await page.goto('/login');
      await page.getByLabel('Username').fill(name);
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      // Scoped to main: Next.js adds its own empty role="alert" route announcer.
      await expect(page.getByRole('main').getByRole('alert')).toHaveText(
        'Invalid username or password',
      );
      await expect(page).toHaveURL('/login');
    }
  });
});

test.describe('signed in', () => {
  test('register, log in and see the dashboard with a secure cookie', async ({
    page,
    context,
  }) => {
    const username = uniqueUsername();
    await page.goto('/register');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Gender').selectOption('male');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/login?registered=1');

    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(
      page.getByRole('heading', { name: 'Dashboard', level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(`Signed in as ${username}`)).toBeVisible();
    expect(await readTotal(page)).toBeGreaterThanOrEqual(1);
    for (const gender of ['male', 'female', 'other']) {
      await expect(genderRow(page, gender)).toBeVisible();
    }
    expect(await readGenderCount(page, 'male')).toBeGreaterThanOrEqual(1);

    const cookie = (await context.cookies()).find((c) => c.name === COOKIE);
    expect(cookie).toBeDefined();
    expect(cookie!.httpOnly).toBe(true);
    expect(cookie!.sameSite).toBe('Lax');
    expect(cookie!.path).toBe('/');
    expect(await page.evaluate(() => document.cookie)).not.toContain(COOKIE);
    expect(await page.locator('body').textContent()).not.toContain(
      cookie!.value,
    );
  });

  test('the totals reflect a newly registered user after reload', async ({
    page,
    request,
  }) => {
    await signUpAndLogIn(page, request);
    const total = await readTotal(page);
    const others = await readGenderCount(page, 'other');

    await registerViaApi(request, uniqueUsername(), 'other');
    await page.reload();

    await expect(
      page
        .getByRole('region', { name: 'Total registered users' })
        .getByRole('paragraph'),
    ).toHaveText(String(total + 1));
    expect(await readGenderCount(page, 'other')).toBe(others + 1);
  });

  test('guest-only and root paths redirect to /dashboard', async ({
    page,
    request,
  }) => {
    await signUpAndLogIn(page, request);

    for (const path of ['/login', '/register', '/']) {
      await page.goto(path);
      await expect(page).toHaveURL('/dashboard');
    }
  });

  test('logging out clears the session for good', async ({
    page,
    context,
    request,
  }) => {
    await signUpAndLogIn(page, request);

    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL('/login');
    expect((await context.cookies()).map((c) => c.name)).not.toContain(COOKIE);
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
    await page.goBack();
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Signed in as')).toHaveCount(0);
  });

  test('a tampered cookie ends on /login without a redirect loop', async ({
    page,
    context,
    request,
  }) => {
    await signUpAndLogIn(page, request);
    const cookie = (await context.cookies()).find((c) => c.name === COOKIE)!;
    await context.addCookies([{ ...cookie, value: 'not-a-valid-jwt' }]);

    let navigations = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations += 1;
    });
    await page.goto('/dashboard');

    await expect(page).toHaveURL('/login', { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: 'Sign in', level: 1 }),
    ).toBeVisible();
    expect((await context.cookies()).map((c) => c.name)).not.toContain(COOKIE);
    // /dashboard, then /login: anything well beyond that means the guard and the
    // dashboard are bouncing the browser between them.
    expect(navigations).toBeLessThanOrEqual(4);
  });
});
