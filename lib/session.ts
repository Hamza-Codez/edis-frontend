import 'server-only';
import { cookies } from 'next/headers';

import type { CurrentUser } from './types';

/**
 * Why this is a union and not `CurrentUser | null`.
 *
 * The previous version returned null for every failure, so "no cookie",
 * "the backend rejected this session" and "the backend could not be reached"
 * were indistinguishable. The layout reads that result to decide whether to
 * render the header and sidebar, so any backend hiccup silently rendered a
 * signed-in user a chrome-less page: no navigation, no sign-out, no error, and
 * nothing in any log saying why.
 *
 * It was reachable two ways at once, because proxy.ts admits a request when the
 * session cookie merely *exists* while this check requires the backend to
 * *validate* it:
 *
 *  - a stale cookie (rotated SESSION_SECRET, truncated database, expired row)
 *    passes the proxy and fails here — and proxy.ts also bounces /login back to
 *    /, so the user cannot reach the sign-in form to fix it;
 *  - API_ORIGIN missing from the server runtime, or the API unreachable from
 *    the server's network position, fails here while the browser's own requests
 *    still succeed through the /api rewrite — which is why the page could show
 *    real document data inside a broken shell.
 */
export type SessionState =
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: CurrentUser }
  | { status: 'expired' }
  | { status: 'unavailable'; reason: string };

/** Server-side only. Logged, never rendered — it can name internal hosts. */
function unavailable(reason: string, cause?: unknown): SessionState {
  console.error(`[session] identity lookup failed: ${reason}`, cause ?? '');
  return { status: 'unavailable', reason };
}

export async function getSessionState(): Promise<SessionState> {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie) return { status: 'anonymous' };

  const origin = process.env.API_ORIGIN;
  if (!origin) {
    // Read at request time here, unlike next.config.ts which reads it at build
    // time. A deployment can therefore satisfy the build and still leave this
    // undefined, in which case fetch() would be handed the string
    // "undefined/auth/me" and throw a URL parse error attributed to nothing.
    return unavailable('API_ORIGIN is not set in the server runtime.');
  }

  let res: Response;
  try {
    res = await fetch(`${origin}/auth/me`, {
      headers: { Cookie: `session=${sessionCookie.value}` },
      cache: 'no-store',
    });
  } catch (cause) {
    return unavailable('the API could not be reached from the server.', cause);
  }

  // 401/403 is an answer, not a failure: the session is genuinely finished, and
  // signing in again fixes it. Everything else means we do not know.
  if (res.status === 401 || res.status === 403) return { status: 'expired' };
  if (!res.ok) return unavailable(`the API answered ${res.status} for /auth/me.`);

  try {
    return { status: 'authenticated', user: (await res.json()) as CurrentUser };
  } catch (cause) {
    return unavailable('the API returned a body that was not JSON.', cause);
  }
}

/**
 * The identity, or null. For pages that only vary their content by role and can
 * legitimately treat "unknown" as "not an admin"; the layout must not use this,
 * because it decides whether the application shell exists at all.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const state = await getSessionState();
  return state.status === 'authenticated' ? state.user : null;
}
