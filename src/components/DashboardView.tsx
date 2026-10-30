'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { GlassCard } from '@/components/GlassCard';
import { ApiError, getMe, getStats, logout } from '@/lib/api';
import { GENDERS, type Stats, type User } from '@/lib/types';

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const LOGOUT_ERROR = 'Could not log out. Please try again.';

type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; user: User; stats: Stats };

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR;
}

function percentage(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((count / total) * 100)));
}

export function DashboardView() {
  const router = useRouter();
  const [state, setState] = useState<DashboardState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  useEffect(() => {
    // Set on unmount or retry, so a late response can't overwrite newer state.
    let ignore = false;

    async function load() {
      try {
        const [user, stats] = await Promise.all([getMe(), getStats()]);
        if (!ignore) setState({ status: 'ready', user, stats });
      } catch (error) {
        if (ignore) return;
        if (error instanceof ApiError && error.status === 401) {
          try {
            // Clear the stale cookie first, or the proxy would bounce /login back here.
            await logout();
          } catch (logoutFailure) {
            if (!ignore) {
              setState({
                status: 'error',
                message: errorMessage(logoutFailure),
              });
            }
            return;
          }
          if (ignore) return;
          router.replace('/login');
          router.refresh();
          return;
        }
        setState({ status: 'error', message: errorMessage(error) });
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [attempt, router]);

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError(false);
    try {
      await logout();
      // Stay disabled while navigating so logout can't be clicked twice.
      router.replace('/login');
      router.refresh();
    } catch {
      setLogoutError(true);
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <GlassCard
        as="header"
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="min-w-0">
          <h1 className="heading">Dashboard</h1>
          {state.status === 'ready' && (
            <p className="caption mt-1 break-all">
              Signed in as{' '}
              <strong className="text-fg">{state.user.username}</strong>
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={handleLogout}
          disabled={loggingOut}
          loading={loggingOut}
        >
          {loggingOut ? 'Logging out...' : 'Log out'}
        </Button>
      </GlassCard>

      {logoutError && (
        <p role="alert" className="banner-error">
          {LOGOUT_ERROR}
        </p>
      )}

      {state.status === 'loading' && (
        <DashboardSkeleton
          title={
            <p role="status" className="caption mb-3">
              Loading dashboard...
            </p>
          }
        />
      )}

      {state.status === 'error' && (
        <GlassCard
          role="alert"
          className="border-danger-tint/50 bg-danger-tint/15"
        >
          <p className="mb-4">{state.message}</p>
          <Button type="button" variant="danger" onClick={retry}>
            Try again
          </Button>
        </GlassCard>
      )}

      {state.status === 'ready' && (
        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard as="section" aria-labelledby="total-heading">
            <h2 id="total-heading" className="caption mb-3 font-medium">
              Total registered users
            </h2>
            <div className="relative mx-auto grid size-40 place-items-center">
              <span
                aria-hidden="true"
                className="donut absolute inset-0 rounded-full"
              />
              <p className="text-5xl leading-none font-bold tabular-nums">
                {state.stats.total}
              </p>
            </div>
          </GlassCard>

          <GlassCard as="section" aria-labelledby="gender-heading">
            <h2 id="gender-heading" className="caption mb-3 font-medium">
              Users by gender
            </h2>
            <ul className="flex flex-col gap-4">
              {GENDERS.map((gender) => {
                const count = state.stats.by_gender[gender] ?? 0;
                const percent = percentage(count, state.stats.total);
                return (
                  <li key={gender} className="flex flex-col gap-2">
                    <div className="flex justify-between gap-2">
                      {/* Values come from the API in lowercase; capitalizing is display-only. */}
                      <span className="font-medium capitalize">{gender}</span>
                      <span className="text-fg-muted tabular-nums">
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-white/15"
                      aria-hidden="true"
                    >
                      <div
                        className="from-neon-magenta via-neon-orange to-neon-yellow h-full rounded-full bg-linear-to-r transition-[width] motion-reduce:transition-none"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
