# spec01.md — Login and session shell (UI)
**Phase 1 · Backend: `edis-backend/spec/spec01.md`**
**Inherits the ground rules in `spec00.md §2`.**

---

## 1. The problem

No way in. Every later screen needs an authenticated shell, a place to show who is signed
in, and navigation that reflects role.

---

## 2. Screens

| Route | Rendering | Notes |
|---|---|---|
| `/login` | Client Component | Email + password, inline error, submit disabled in flight |
| `/` | Server Component | Authenticated shell: nav, current user, sign out |

Unauthenticated access to anything but `/login` redirects to `/login`. Authenticated access
to `/login` redirects to `/`.

---

## 3. Session handling

The session cookie is `HttpOnly` — the client never reads it. A **server-only** module
resolves the current user by calling `GET /auth/me`; importing it from a Client Component
is a build error, on purpose.

Middleware handles the redirect. **This is UX, not security**: it keeps someone off a
screen the backend would refuse anyway. No authorization decision is made here.

Per-role navigation hides admin links from members for the same reason — the backend
returns 404 to them regardless.

---

## 4. Error presentation

The login form shows the backend's message verbatim. The backend deliberately returns an
identical 401 for unknown email, wrong password and deactivated account; **do not add
client-side logic that distinguishes them.** Any "helpful" refinement here recreates the
account-enumeration oracle the backend was careful to avoid.

Submit is disabled while a request is in flight — network latency makes people double-click,
and a duplicate login is a wasted session row.

---

## 5. Tests

| Tier | Cases |
|---|---|
| unit | fetch wrapper attaches `X-CSRF-Token` from the cookie on mutations, and omits it on GETs |
| component | login form disables submit in flight; renders the envelope's `error.message` |
| guard | importing the server-only session module from a Client Component fails the build |

---

## 6. Definition of done

- [ ] Type check, lint, tests green
- [ ] **Clean production build** — `.next/` and `tsconfig.tsbuildinfo` removed first, no dev
      server running
- [ ] Types regenerated from the deployed backend, re-exported not redefined
- [ ] Checked in a **real browser** on the deployed URL: log in, reload, still logged in
- [ ] Committed after the backend

---

## As Built — 2026-08-28

Login, session shell and redirect guard work locally. **Not verified on a
deployed site.**

**Divergences**

- The redirect guard lives in `proxy.ts` (see `spec00` *As Built*) and had never
  executed until the export name was corrected.
- `lib/session.ts` returns the generated `CurrentUser` type rather than a
  hand-written shape.

**Note**

The login form still shows the backend message verbatim, including the identical
401 for unknown email, wrong password and deactivated account. Nothing in the UI
distinguishes them, which is the point.
