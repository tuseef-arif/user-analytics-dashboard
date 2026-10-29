import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, getMe, getStats, login, logout, register } from '@/lib/api';
import type { Stats, User } from '@/lib/types';

const user: User = {
  id: 1,
  username: 'testuser@email.com',
  gender: 'male',
  created_at: '2026-10-29T12:00:00Z',
};
const stats: Stats = { total: 3, by_gender: { male: 1, female: 1, other: 1 } };

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function lastCall(): { url: string; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: String(url), init: init ?? {} };
}

async function apiErrorFrom(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requests', () => {
  it('register POSTs JSON to /api/auth/register and returns the user', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, user));
    const input = {
      username: 'testuser@email.com',
      password: 'Password123@',
      gender: 'male',
    } as const;

    await expect(register(input)).resolves.toEqual(user);

    const { url, init } = lastCall();
    expect(url).toBe('/api/auth/register');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual(input);
  });

  it('login POSTs JSON to /api/auth/login and returns the user', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, user));
    const input = { username: 'testuser@email.com', password: 'Password123@' };

    await expect(login(input)).resolves.toEqual(user);

    const { url, init } = lastCall();
    expect(url).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body as string)).toEqual(input);
  });

  it('logout POSTs without a body and resolves to undefined on 204', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(logout()).resolves.toBeUndefined();

    const { url, init } = lastCall();
    expect(url).toBe('/api/auth/logout');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.body).toBeUndefined();
    expect(init.headers).not.toHaveProperty('Content-Type');
  });

  it('getMe GETs /api/auth/me without caching', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, user));

    await expect(getMe()).resolves.toEqual(user);

    const { url, init } = lastCall();
    expect(url).toBe('/api/auth/me');
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
    expect(init.cache).toBe('no-store');
  });

  it('getStats GETs /api/dashboard/stats without caching', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, stats));

    await expect(getStats()).resolves.toEqual(stats);

    const { url, init } = lastCall();
    expect(url).toBe('/api/dashboard/stats');
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
    expect(init.cache).toBe('no-store');
  });
});

describe('errors', () => {
  it('uses a string detail as the message on 401', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { detail: 'Invalid username or password' }),
    );

    const error = await apiErrorFrom(
      login({ username: 'x', password: 'wrong' }),
    );
    expect(error.status).toBe(401);
    expect(error.message).toBe('Invalid username or password');
    expect(error.fieldErrors).toBeUndefined();
  });

  it('surfaces the duplicate-username 409', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { detail: 'Username already taken' }),
    );

    const error = await apiErrorFrom(
      register({ username: 'taken', password: 'Password123@', gender: 'male' }),
    );
    expect(error.status).toBe(409);
    expect(error.message).toBe('Username already taken');
  });

  it('maps a 422 detail array to fieldErrors and a joined message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        detail: [
          {
            type: 'string_too_short',
            loc: ['body', 'username'],
            msg: 'String should have at least 3 characters',
          },
          {
            type: 'string_too_short',
            loc: ['body', 'password'],
            msg: 'String should have at least 8 characters',
          },
          {
            type: 'enum',
            loc: ['body', 'gender'],
            msg: "Input should be 'male', 'female' or 'other'",
          },
          {
            type: 'value_error',
            loc: ['body', 'username'],
            msg: 'Value error, may only contain letters, digits and the characters . _ + @ -',
          },
        ],
      }),
    );

    const error = await apiErrorFrom(
      register({ username: 'a', password: 'short', gender: 'male' }),
    );
    expect(error.status).toBe(422);
    expect(error.fieldErrors).toEqual({
      username: 'String should have at least 3 characters',
      password: 'String should have at least 8 characters',
      gender: "Input should be 'male', 'female' or 'other'",
    });
    expect(error.message).toBe(
      'username: String should have at least 3 characters; ' +
        'password: String should have at least 8 characters; ' +
        "gender: Input should be 'male', 'female' or 'other'; " +
        'username: may only contain letters, digits and the characters . _ + @ -',
    );
  });

  it('turns a fetch rejection into a status-0 network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await apiErrorFrom(getMe());
    expect(error.status).toBe(0);
    expect(error.message).toBe('Network error. Please try again.');
  });

  it('falls back to a generic message for a non-JSON error body', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>Bad Gateway</html>', { status: 502 }),
    );

    const error = await apiErrorFrom(getStats());
    expect(error.status).toBe(502);
    expect(error.message).toBe('Unexpected error (status 502)');
  });

  it('falls back to a generic message for an empty error body', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }));

    const error = await apiErrorFrom(getStats());
    expect(error.message).toBe('Unexpected error (status 500)');
  });

  it('falls back to a generic message when detail has an unknown shape', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { detail: { odd: true } }));

    const error = await apiErrorFrom(getStats());
    expect(error.message).toBe('Unexpected error (status 400)');
  });

  it('rejects a 200 response whose body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('not json', { status: 200 }));

    const error = await apiErrorFrom(getMe());
    expect(error.status).toBe(200);
    expect(error.message).toBe('Unexpected error (status 200)');
  });
});
