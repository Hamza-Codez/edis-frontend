# spec00.md — Foundations, deployed skeleton (UI)
**Phase 0 · Backend: `edis-backend/spec/spec00.md`**

This spec carries the **project-wide UI ground rules** for EDIS. Every later frontend spec
inherits from it and does not restate it. The backend counterpart carries the domain
invariants; read it too.

---

## 1. The problem

Nothing exists. The frontend's job in Phase 0 is not a screen — it is to prove that the
same-origin proxy design actually compiles and routes on the real platform, before any
feature depends on it.

The failure this prevents is specific and common: `/api/anything` returning the app's HTML
shell instead of JSON, because the rewrite never applied. Every auth call then fails with a
parse error that points nowhere near the cause.

---

## 2. Ground rules (inherited by every frontend spec)

### 2.1 The proxy pattern

**The browser never calls the backend directly.** `next.config.ts` rewrites
`/api/:path*` to the backend origin, so the browser only ever talks to its own origin: no
CORS preflight, and httpOnly cookies attach automatically.

```ts
// next.config.ts
const apiOrigin = process.env.API_ORIGIN?.replace(/\/+$/, "");
if (process.env.NODE_ENV === "production" && !apiOrigin) {
  throw new Error("API_ORIGIN is required for production builds.");
}
if (process.env.NEXT_PUBLIC_API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL overrides the proxy. Remove it.");
}
async rewrites() {
  return [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }];
}
```

Three deliberate details:

- **`/api` is stripped, not forwarded.** Backend paths are `/auth/login`, `/documents`,
  `/health`. This makes both verification URLs correct as written —
  `https://<api>/health` and `https://<app>/api/health` reach the same handler. Generated
  OpenAPI path keys therefore lack `/api`, and the fetch wrapper prepends it. That is the
  whole mapping; do not "fix" one half of it.
- **The build refuses to start** without `API_ORIGIN` in production. A build that stops is
  a five-minute fix; one that ships pointing at localhost is an afternoon.
- **The trailing slash is stripped defensively.** A pasted origin carries one, and the
  resulting doubled path 404s in a way that points nowhere near the cause.

**No `NEXT_PUBLIC_API_BASE_URL`, ever.** A public API base overrides the proxy, undoes the
same-origin design, and reintroduces every problem it solved. The build throws if it exists.

**No route handlers under `app/api/*`.** Next.js checks filesystem routes before these
rewrites, so a local handler at that path silently shadows the backend and returns HTML
where JSON was expected. Guard test in §5.

### 2.2 The contract is generated, and drift must be a compile error

```bash
npm run gen:api      # regenerate the typed schema from the running backend
```

The shared types module **re-exports** the generated types and never redefines a shape by
hand. A backend rename then breaks the frontend build at type check — loudly, at the
earliest possible moment — instead of failing at runtime in front of a user. Expect that
alarm to fire; it is doing its job.

**Never hand-edit the generated schema file.** It is regenerated; edits vanish and take the
drift alarm with them.

This is also why there is no separate contract-test tier: the type check *is* the contract
test.

### 2.3 Fetch wrapper

One module, used by everything:

- prepends `/api`
- sends `credentials: "same-origin"`
- reads the `csrf_token` cookie and sets `X-CSRF-Token` on every mutating request
- parses the error envelope `{ error: { code, message, details } }` into a typed error
- **never** invents a shape the generated types do not have

### 2.4 Sessions and route guards

The session cookie is `HttpOnly`, so only the server can read it. The module that reads it
is marked **server-only**, making an import from a client component a build error, on
purpose.

**Route guards and per-role navigation are UX, never security.** Hiding a link keeps
someone off a screen that would refuse them anyway; the backend stays authoritative and
returns 404 for anything they may not see.

### 2.5 Rendering

Server Components by default. Client Components only where interactivity requires them —
in this project that is upload, polling, the question box, and the evidence panel.

Frontend validation may improve UX; backend validation remains authoritative. No business
rule is duplicated here.

### 2.6 Styling, and two silent failure modes

Tailwind with **design tokens**. Know what the config *replaces* versus *extends*: if it
replaces the colour, radius or weight scales, every default-palette utility compiles to
**nothing**, silently. Only design tokens exist — treat a default-palette class as a typo.

**Opacity modifiers need an alpha placeholder.** A colour defined as a plain CSS variable
cannot produce `text-foo/60`; the class is dropped silently. It looks fine wherever text
inherits a sensible colour and vanishes the moment it lands on contrasting chrome. Define a
real token for secondary text instead of reaching for an opacity modifier.

### 2.7 Verification discipline

**Verify by rendering, not by reading.** Tests pass and the screen is still wrong — charts
that never paint, panels of invisible text, controls in browser-default colours. Where a
change is visual, drive a real browser and **measure computed styles** rather than asserting
class names.

**One dev server at a time**, and **never build while one is running.** Two processes share
`.next/` and corrupt it; symptoms range from framework-internal invariant errors to the
client runtime bundle 404ing, which silently kills hydration so the page renders but nothing
responds to clicks. Before a production build, remove `.next/` **and**
`tsconfig.tsbuildinfo` — the latter caches deleted generated types as compiler roots and
fails the build with errors about files that no longer exist.

**The production build is part of the gate.** A framework build fails on things lint, type
check and the test runner all pass — a test file inside the routable app directory, for
instance, which fails with an error naming neither the file nor the cause while every other
check is green. The app would not have deployed.

---

## 3. Contract

No user-facing screens this phase.

| Route | Purpose |
|---|---|
| `/` | Placeholder shell with the app name and layout chrome |

The deliverable is the pipeline, not the page.

---

## 4. Environment

| Variable | Required | Note |
|---|---|---|
| `API_ORIGIN` | yes | The Railway URL. Set for **Production and Preview**. Read at **build** time — changing it needs a redeploy, not a restart |
| `NEXT_PUBLIC_API_BASE_URL` | **must not exist** | The build throws if defined |

`.env.example` committed with both entries, the second documented as forbidden. Never
commit `.env.local`.

No Dockerfile in this repo, ever. Vercel builds Next.js natively; a container adds a layer
it already handles.

---

## 5. Tests

Three guard tests that earn their place before there is anything to guard:

| Test | Catches |
|---|---|
| No files exist under `app/api/**` | A local route handler shadowing the proxy rewrite |
| No test files inside the routable app directory | A production build failure whose error names neither the file nor the cause |
| `next.config.ts` throws when `NEXT_PUBLIC_API_BASE_URL` is set | Someone reintroducing a public API base and undoing the same-origin design |

---

## 6. Definition of done

- [ ] Type check, lint, tests green
- [ ] **Clean production build** — `.next/` and `tsconfig.tsbuildinfo` removed first, no dev
      server running
- [ ] Deployed to Vercel with `API_ORIGIN` set for **Production and Preview**, no trailing
      slash
- [ ] `https://<app>.vercel.app/api/health` returns **JSON, not HTML**
- [ ] `npm run gen:api` runs against the deployed backend and produces a schema file
- [ ] Backend committed and deployed **first**

---

## As Built — 2026-08-28

The proxy works locally: `/api/health` returns JSON and login succeeds through
the frontend origin with both cookies set correctly. **Not deployed**, so
`API_ORIGIN` has never been exercised for Production or Preview.

**Divergences**

- **`proxy.ts` exports `proxy`, not `middleware`.** Next.js 16 renamed
  `middleware.ts` to `proxy.ts` and expects the matching export name. Exported as
  `middleware` it is not a warning — `next build` fails outright, so the login
  redirect guard had never run and the app would never have deployed.
- **`next.config.ts` warns loudly in development when `API_ORIGIN` is missing.**
  Without it the rewrite is not registered at all, `/api/*` falls through to the
  app and returns the HTML shell, and the only symptom is
  `HTTP error! status: 404` on login — a message pointing nowhere near the cause.
  This cost a debugging session; the warning names the file, the variable, and
  the need to restart.
- `.gitignore` gained a `!.env.example` exception. The Next.js default `.env*`
  pattern swept the committed template that `rules.md` requires.

**The guard tests earned their place**

`app/api/**` is still empty and no test file sits inside the routable app
directory. Both would fail in ways that name neither the file nor the cause.
