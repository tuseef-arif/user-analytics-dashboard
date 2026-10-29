// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardView } from '@/components/DashboardView';
import { ApiError, getMe, getStats, logout } from '@/lib/api';
import type { Stats, User } from '@/lib/types';

const replace = vi.fn();
const refresh = vi.fn();
// One stable object, like the real router; a new one per render would re-run the
// data effect on every render.
const router = { replace, refresh };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/api', async (importOriginal) => ({
  // Keep the real ApiError so the component's instanceof check still works.
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getMe: vi.fn(),
  getStats: vi.fn(),
  logout: vi.fn(),
}));
const getMeMock = vi.mocked(getMe);
const getStatsMock = vi.mocked(getStats);
const logoutMock = vi.mocked(logout);

const user: User = {
  id: 1,
  username: 'testuser@email.com',
  gender: 'male',
  created_at: '2026-10-30T12:00:00Z',
};

const stats: Stats = {
  total: 4,
  by_gender: { male: 2, female: 1, other: 1 },
};

function rowText(gender: string): string {
  const row = screen
    .getAllByRole('listitem')
    .find((item) => within(item).queryByText(gender));
  expect(row).toBeDefined();
  return row!.textContent ?? '';
}

async function renderReady() {
  render(<DashboardView />);
  await screen.findByText('Signed in as');
}

beforeEach(() => {
  getMeMock.mockReset();
  getStatsMock.mockReset();
  logoutMock.mockReset();
  replace.mockReset();
  refresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('loading data', () => {
  it('shows loading first, then the user, total and every gender', async () => {
    getMeMock.mockResolvedValue(user);
    getStatsMock.mockResolvedValue(stats);
    render(<DashboardView />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading dashboard...',
    );

    expect(await screen.findByText('testuser@email.com')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Dashboard', level: 1 }),
    ).toBeInTheDocument();
    const total = screen.getByRole('region', {
      name: 'Total registered users',
    });
    expect(total).toHaveTextContent('4');
    const breakdown = screen.getByRole('region', { name: 'Users by gender' });
    expect(within(breakdown).getAllByRole('listitem')).toHaveLength(3);
    expect(rowText('male')).toContain('2 (50%)');
    expect(rowText('female')).toContain('1 (25%)');
    expect(rowText('other')).toContain('1 (25%)');
  });

  it('calls getMe and getStats once each on mount', async () => {
    getMeMock.mockResolvedValue(user);
    getStatsMock.mockResolvedValue(stats);
    await renderReady();

    expect(getMeMock).toHaveBeenCalledTimes(1);
    expect(getStatsMock).toHaveBeenCalledTimes(1);
  });

  it('shows 0% everywhere when there are no users', async () => {
    getMeMock.mockResolvedValue(user);
    getStatsMock.mockResolvedValue({
      total: 0,
      by_gender: { male: 0, female: 0, other: 0 },
    });
    const { container } = render(<DashboardView />);
    await screen.findByText('Signed in as');

    for (const gender of ['male', 'female', 'other']) {
      expect(rowText(gender)).toContain('0 (0%)');
    }
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
    for (const bar of container.querySelectorAll<HTMLElement>(
      '[aria-hidden="true"] > div',
    )) {
      expect(bar.style.width).toBe('0%');
    }
  });

  it('shows 0 for a gender missing from by_gender', async () => {
    getMeMock.mockResolvedValue(user);
    getStatsMock.mockResolvedValue({
      total: 2,
      by_gender: { male: 1, female: 1 },
    } as unknown as Stats);
    await renderReady();

    expect(rowText('other')).toContain('0 (0%)');
    expect(rowText('male')).toContain('1 (50%)');
  });

  it('does not update state after unmounting', async () => {
    const consoleError = vi.spyOn(console, 'error');
    let resolveMe!: (value: User) => void;
    getMeMock.mockReturnValue(new Promise<User>((r) => (resolveMe = r)));
    getStatsMock.mockResolvedValue(stats);
    const { unmount } = render(<DashboardView />);

    unmount();
    resolveMe(user);
    await new Promise((r) => setTimeout(r, 0));

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('ignores a 401 that arrives after unmounting', async () => {
    let rejectMe!: (error: unknown) => void;
    getMeMock.mockReturnValue(new Promise<User>((_, r) => (rejectMe = r)));
    getStatsMock.mockResolvedValue(stats);
    const { unmount } = render(<DashboardView />);

    unmount();
    rejectMe(new ApiError(401, 'Not authenticated'));
    await new Promise((r) => setTimeout(r, 0));

    expect(logoutMock).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('expired session (401)', () => {
  it.each(['getMe', 'getStats'] as const)(
    'logs out, then replaces and refreshes when %s returns 401',
    async (failing) => {
      const unauthorized = new ApiError(401, 'Not authenticated');
      getMeMock.mockImplementation(() =>
        failing === 'getMe'
          ? Promise.reject(unauthorized)
          : Promise.resolve(user),
      );
      getStatsMock.mockImplementation(() =>
        failing === 'getStats'
          ? Promise.reject(unauthorized)
          : Promise.resolve(stats),
      );
      logoutMock.mockResolvedValue(undefined);
      render(<DashboardView />);

      await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
      expect(logoutMock).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith('/login');
      expect(logoutMock.mock.invocationCallOrder[0]).toBeLessThan(
        replace.mock.invocationCallOrder[0],
      );
      expect(replace.mock.invocationCallOrder[0]).toBeLessThan(
        refresh.mock.invocationCallOrder[0],
      );
    },
  );

  it('shows an error and does not redirect when logout also fails', async () => {
    getMeMock.mockRejectedValue(new ApiError(401, 'Not authenticated'));
    getStatsMock.mockResolvedValue(stats);
    logoutMock.mockRejectedValue(
      new ApiError(0, 'Network error. Please try again.'),
    );
    render(<DashboardView />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Network error. Please try again.',
    );
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('other errors', () => {
  it.each([
    [new ApiError(500, 'Unexpected error (status 500)')],
    [new ApiError(0, 'Network error. Please try again.')],
  ])('shows %s with a retry that refetches', async (error) => {
    getMeMock.mockRejectedValueOnce(error).mockResolvedValue(user);
    getStatsMock.mockResolvedValue(stats);
    const ue = userEvent.setup();
    render(<DashboardView />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(error.message);
    expect(logoutMock).not.toHaveBeenCalled();

    await ue.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('testuser@email.com')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(getMeMock).toHaveBeenCalledTimes(2);
    expect(getStatsMock).toHaveBeenCalledTimes(2);
  });

  it('shows loading again while retrying', async () => {
    getMeMock
      .mockRejectedValueOnce(new ApiError(500, 'Unexpected error (status 500)'))
      .mockReturnValue(new Promise<User>(() => {}));
    getStatsMock.mockResolvedValue(stats);
    const ue = userEvent.setup();
    render(<DashboardView />);

    await ue.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading dashboard...',
    );
  });

  it('shows a generic message for a non-API error', async () => {
    getMeMock.mockRejectedValue(new Error('boom'));
    getStatsMock.mockResolvedValue(stats);
    render(<DashboardView />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
  });
});

describe('logging out', () => {
  beforeEach(() => {
    getMeMock.mockResolvedValue(user);
    getStatsMock.mockResolvedValue(stats);
  });

  it('disables the button while pending, ignores repeat clicks, then redirects', async () => {
    let resolve!: () => void;
    logoutMock.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const ue = userEvent.setup();
    await renderReady();

    await ue.click(screen.getByRole('button', { name: 'Log out' }));

    const pending = screen.getByRole('button', { name: 'Logging out...' });
    expect(pending).toBeDisabled();
    await ue.click(pending);
    expect(logoutMock).toHaveBeenCalledTimes(1);

    resolve();
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith('/login');
    expect(replace.mock.invocationCallOrder[0]).toBeLessThan(
      refresh.mock.invocationCallOrder[0],
    );
  });

  it('shows an alert, re-enables the button and stays on failure', async () => {
    logoutMock.mockRejectedValue(
      new ApiError(0, 'Network error. Please try again.'),
    );
    const ue = userEvent.setup();
    await renderReady();

    await ue.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not log out. Please try again.',
    );
    expect(screen.getByRole('button', { name: 'Log out' })).toBeEnabled();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('testuser@email.com')).toBeInTheDocument();
  });
});
