import { NextResponse, type NextRequest } from 'next/server';

import { resolveAuthRedirect } from '@/lib/auth-guard';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants';

// A UX redirect only: it checks that the cookie exists, not that it is valid. The
// backend verifies the JWT on every API call, so a forged cookie shows a page shell
// but never any data.
export function proxy(request: NextRequest) {
  const hasSessionCookie = Boolean(
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value,
  );
  const target = resolveAuthRedirect(
    request.nextUrl.pathname,
    hasSessionCookie,
  );
  return target
    ? NextResponse.redirect(new URL(target, request.url))
    : NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login', '/register'],
};
