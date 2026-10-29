import { describe, expect, it } from 'vitest';

import { resolveAuthRedirect } from '@/lib/auth-guard';

describe('resolveAuthRedirect', () => {
  it.each([
    ['/', false, '/login'],
    ['/', true, '/dashboard'],
    ['/dashboard', false, '/login'],
    ['/dashboard', true, null],
    ['/dashboard/anything', false, '/login'],
    ['/dashboard/anything', true, null],
    ['/login', false, null],
    ['/login', true, '/dashboard'],
    ['/register', false, null],
    ['/register', true, '/dashboard'],
    ['/about', false, null],
    ['/about', true, null],
    // Only real sub-paths are protected, not names that merely start the same.
    ['/dashboards', false, null],
  ])('%s with cookie=%s -> %s', (pathname, hasCookie, expected) => {
    expect(resolveAuthRedirect(pathname, hasCookie)).toBe(expected);
  });
});
