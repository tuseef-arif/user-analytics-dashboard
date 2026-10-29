import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const PASSWORD = 'Password123@';

// Tests share one database, so every user needs a name no other test (or run) uses.
export function uniqueUsername(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `e2e-${Date.now()}-${random}@email.com`;
}

export async function registerViaApi(
  request: APIRequestContext,
  username: string,
  gender: 'male' | 'female' | 'other' = 'female',
): Promise<void> {
  const response = await request.post('/api/auth/register', {
    data: { username, password: PASSWORD, gender },
  });
  expect(response.status()).toBe(201);
}

export async function logIn(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('Signed in as')).toBeVisible();
}

export async function signUpAndLogIn(
  page: Page,
  request: APIRequestContext,
): Promise<string> {
  const username = uniqueUsername();
  await registerViaApi(request, username);
  await logIn(page, username);
  return username;
}

export async function readTotal(page: Page): Promise<number> {
  const text = await page
    .getByRole('region', { name: 'Total registered users' })
    .getByRole('paragraph')
    .textContent();
  return Number(text);
}

export function genderRow(page: Page, gender: string) {
  return page
    .getByRole('region', { name: 'Users by gender' })
    .getByRole('listitem')
    .filter({ has: page.getByText(gender, { exact: true }) });
}

export async function readGenderCount(
  page: Page,
  gender: string,
): Promise<number> {
  const text = (await genderRow(page, gender).textContent()) ?? '';
  const match = text.match(/(\d+) \(\d+%\)/);
  expect(match, `count for ${gender}`).not.toBeNull();
  return Number(match![1]);
}
