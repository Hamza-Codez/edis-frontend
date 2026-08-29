/**
 * @jest-environment node
 */

// 'server-only' throws by design when imported outside a server component.
jest.mock('server-only', () => ({}));

const mockGet = jest.fn();
jest.mock('next/headers', () => ({
  cookies: async () => ({ get: mockGet }),
}));

import { getSessionState } from '../lib/session';

const ORIGIN = 'http://api.test';

describe('getSessionState', () => {
  let error: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.API_ORIGIN = ORIGIN;
    mockGet.mockReturnValue({ value: 'a-session-token' });
    error = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => error.mockRestore());

  const respond = (init: { status: number; json?: unknown }) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: init.status >= 200 && init.status < 300,
      status: init.status,
      json: async () => init.json,
    }) as unknown as typeof fetch;
  };

  it('is anonymous when there is no cookie', async () => {
    mockGet.mockReturnValue(undefined);
    await expect(getSessionState()).resolves.toEqual({ status: 'anonymous' });
  });

  it('is authenticated on 200', async () => {
    const user = { id: '1', email: 'a@b.c', role: 'admin' };
    respond({ status: 200, json: user });
    await expect(getSessionState()).resolves.toEqual({ status: 'authenticated', user });
  });

  it.each([401, 403])('is expired, not unavailable, on %i', async (status) => {
    respond({ status });
    const state = await getSessionState();
    expect(state.status).toBe('expired');
    // Expiry is an answer, not a fault: signing in again fixes it, so it must
    // not reach the "backend is down" screen, which says the opposite.
    expect(error).not.toHaveBeenCalled();
  });

  it('is unavailable, NOT anonymous, when the API cannot be reached', async () => {
    // The whole point. Returning null here rendered a signed-in user a page
    // with no navigation, no sign-out and no explanation.
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed')) as never;
    const state = await getSessionState();
    expect(state.status).toBe('unavailable');
    expect(error).toHaveBeenCalled();
  });

  it('is unavailable when API_ORIGIN is missing from the runtime', async () => {
    delete process.env.API_ORIGIN;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as never;

    const state = await getSessionState();

    expect(state.status).toBe('unavailable');
    // Never attempted: fetch would have been handed "undefined/auth/me".
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });

  it('is unavailable on a 5xx, which says nothing about the session', async () => {
    respond({ status: 502 });
    const state = await getSessionState();
    expect(state.status).toBe('unavailable');
  });

  it('forwards the session cookie to the API', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    global.fetch = fetchSpy as never;

    await getSessionState();

    expect(fetchSpy).toHaveBeenCalledWith(
      `${ORIGIN}/auth/me`,
      expect.objectContaining({
        headers: { Cookie: 'session=a-session-token' },
        cache: 'no-store',
      })
    );
  });
});
