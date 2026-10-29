// Kept free of Next.js imports so the rules can be unit tested on their own.
export function resolveAuthRedirect(
  pathname: string,
  hasSessionCookie: boolean,
): string | null {
  if (pathname === '/') return hasSessionCookie ? '/dashboard' : '/login';
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return hasSessionCookie ? null : '/login';
  }
  if (pathname === '/login' || pathname === '/register') {
    return hasSessionCookie ? '/dashboard' : null;
  }
  return null;
}
