import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Set by this proxy so the root layout can tell which page it is wrapping.
 * A layout has no access to the pathname otherwise, and it needs one: the
 * sign-in page must render bare even when the session state is bad, or
 * redirecting a dead session to /login loops forever.
 */
export const PATHNAME_HEADER = 'x-pathname';

/** Marks a redirect this app performed because the backend rejected the cookie. */
export const EXPIRED_PARAM = 'session';

// Next.js 16 renamed middleware.ts to proxy.ts and expects the export to be
// named `proxy` (or default). Exported as `middleware` it is not a warning —
// the production build fails, so nothing using it ever deployed.
export function proxy(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname, searchParams } = request.nextUrl;
  const onLogin = pathname.startsWith('/login');

  if (!session && !onLogin) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // This check can only see that a cookie exists, never that the backend still
  // accepts it — validating here would mean a round trip on every navigation.
  // So a cookie the backend has rejected used to be bounced off /login and back
  // to a page that could not render its own navigation, with no way out. The
  // layout detects that case and redirects here carrying the marker.
  const rejected = searchParams.get(EXPIRED_PARAM) === 'expired';
  if (session && pathname === '/login' && !rejected) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
