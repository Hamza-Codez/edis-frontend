# spec06.md — Admin console (UI)
**Phase 6 · Backend: `edis-backend/spec/spec06.md`**
**Inherits the ground rules in `spec00.md §2`.**

---

## 1. The problem

"Is it hallucinating?" is currently answered by opinion. It should be answered by a number
anyone can read off a screen.

---

## 2. Screens

| Route | Rendering | Auth | Notes |
|---|---|---|---|
| `/queries` | Server Component | session | Own queries; all for an admin |
| `/queries/[id]` | Server Component | owner/admin | Question, outcome, retrieved chunks, tokens, latency |
| `/admin/users` | Server Component | admin | Create, change role, deactivate |

Admin routes are hidden from members in navigation — **UX only.** The backend returns 404 to
them regardless.

---

## 3. The one number that matters

`/queries` leads with **outcome mix over time**: answered, insufficient context, ungrounded
rejected, upstream error.

Read it this way, and say so on the page:

- rising **insufficient context** → retrieval or corpus coverage is degrading
- rising **ungrounded rejected** → the prompt or the model is drifting
- rising **upstream error** → provider availability

This is the health of the entire system. A dashboard that shows request counts and latency
percentiles instead would be a dashboard about the web server, not about whether the thing
works.

`insufficient_context` must **not** be styled as a failure. It is the system working. Use a
neutral treatment and reserve the alarming one for `ungrounded_rejected`, which is the
outcome that actually indicates something is going wrong.

---

## 4. Query detail

Question, outcome, the answer as rendered, retrieved chunk ids with their scores, token
counts, latency, model. Enough to reconstruct why a given answer came out as it did without
opening a database client.

Chunks whose document was later deleted show as removed — the log deliberately keeps ids
without a foreign key.

---

## 5. Document actions

`/documents/[id]` gains **Reindex**, shown to the owner and to admins. It re-runs chunking
and embedding from stored page text — no re-upload — and returns the row to `chunking`, which
the existing polling from spec02 already renders with no change.

A confirmation step, because it costs embedding spend and briefly changes what search returns.

---

## 6. User management

Create, change role, deactivate. **Delete is present and expected to fail** for anyone with
history: render the backend's refusal sentence verbatim, in full. It names deactivation as
the remedy, and truncating it to a toast that says "cannot delete" throws away the only
useful part.

---

## 7. Tests

| Tier | Cases |
|---|---|
| component | outcome mix renders all four outcomes including zero counts; `insufficient_context` is not styled as an error; the deletion refusal renders the full sentence, not a truncated toast |

---

## 8. Definition of done

- [ ] Type check, lint, tests green
- [ ] **Clean production build**
- [ ] Types regenerated and re-exported
- [ ] Checked in a **real browser**: the four outcome treatments are distinguishable, and
      `insufficient_context` does not read as a failure
- [ ] Committed after the backend

---

## 9. As Built

*Amend after implementation.*
