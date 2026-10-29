'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ApiError, getMe, getStats, logout } from '@/lib/api';
import { GENDERS, type Stats, type User } from '@/lib/types';

import styles from './DashboardView.module.css';

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
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className={styles.logout}
        >
          {loggingOut ? 'Logging out...' : 'Log out'}
        </button>
      </header>

      {logoutError && (
        <p role="alert" className={styles.alert}>
          {LOGOUT_ERROR}
        </p>
      )}

      {state.status === 'loading' && <p role="status">Loading dashboard...</p>}

      {state.status === 'error' && (
        <div role="alert" className={styles.alert}>
          <p className={styles.alertMessage}>{state.message}</p>
          <button type="button" onClick={retry} className={styles.retry}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && (
        <>
          <p className={styles.signedIn}>
            Signed in as <strong>{state.user.username}</strong>
          </p>

          <section aria-labelledby="total-heading" className={styles.card}>
            <h2 id="total-heading" className={styles.cardTitle}>
              Total registered users
            </h2>
            <p className={styles.total}>{state.stats.total}</p>
          </section>

          <section aria-labelledby="gender-heading" className={styles.card}>
            <h2 id="gender-heading" className={styles.cardTitle}>
              Users by gender
            </h2>
            <ul className={styles.breakdown}>
              {GENDERS.map((gender) => {
                const count = state.stats.by_gender[gender] ?? 0;
                const percent = percentage(count, state.stats.total);
                return (
                  <li key={gender} className={styles.row}>
                    <div className={styles.rowText}>
                      <span className={styles.gender}>{gender}</span>
                      <span>
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className={styles.track} aria-hidden="true">
                      <div
                        className={styles.bar}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
