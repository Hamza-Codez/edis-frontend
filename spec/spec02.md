# spec02.md — Document library and upload (UI)
**Phase 2 · Backend: `edis-backend/spec/spec02.md`**
**Inherits the ground rules in `spec00.md §2`.**

---

## 1. The problem

Documents can be uploaded but not seen. Ingestion is asynchronous, so the interface has to
express *progress* — a state most CRUD UIs never have to show — and it has to make failure
legible rather than leaving a row stuck with no explanation.

---

## 2. Screens

| Route | Rendering | Notes |
|---|---|---|
| `/documents` | Server Component shell, Client Component list | Upload control, table with status |
| `/documents/[id]` | Server Component | Metadata, extracted page text, delete |

---

## 3. Upload

Drag-and-drop plus a file picker. Client-side checks are **UX only** — the backend remains
authoritative:

- File size checked before the request starts, with the limit quoted in the control
  ("PDF or DOCX, up to *N* MB"). The number comes from the backend's `MAX_UPLOAD_BYTES`,
  not a hardcoded copy.
- Extension filter on the picker.

**The submit control is disabled while a request is in flight.** Network latency makes
people double-click, and each duplicate is a wasted upload of a large file. An
`Idempotency-Key` is generated per attempt and sent with the request.

On 202 the new row appears immediately at `pending`.

---

## 4. Status and polling

Six states from the backend, rendered as distinct badges:

`pending` → `extracting` → `chunking` → `embedding` → `indexed` · `failed`

(The middle two arrive with spec03 and are rendered now so that phase needs no UI change.)

Polling runs **only while at least one row is non-terminal**, and stops when none are. A
poll that never stops is a background request every few seconds forever, on every open tab.

`failed` rows show `status_detail` verbatim — the backend writes sentences that name the
remedy ("this appears to be scanned images with no text layer…"), and paraphrasing them
here would throw that away. A Retry action re-uploads.

**A row at `pending` for a long time is a real signal**, not a rendering problem: the
container restarted mid-job, and the backend's startup reaper will move it to `failed`. Do
not paper over it with an optimistic spinner state.

---

## 5. Detail page

Metadata (filename, size, pages, uploader, timestamps) and extracted page text, paginated by
page number. This is the only place extraction quality is visible before chunking exists —
it is worth rendering properly rather than as a debug dump.

DOCX has no printed pages; label its units **"section N"**, not "page N".

Delete is shown to the owner and to admins. Everyone else gets 404 from the backend on the
whole route, so the page simply does not exist for them.

---

## 6. Tests

| Tier | Cases |
|---|---|
| component | submit disabled in flight; polling stops when every row is terminal; `failed` renders `status_detail` verbatim |
| guard | no fetch call constructs an absolute backend URL — everything goes through the wrapper |

---

## 7. Definition of done

- [ ] Type check, lint, tests green
- [ ] **Clean production build** — `.next/` and `tsconfig.tsbuildinfo` removed first
- [ ] Types regenerated and re-exported
- [ ] Checked in a **real browser** with computed styles: status badges are legible in both
      the table and on contrasting chrome — this is exactly where a dropped opacity modifier
      or a default-palette class shows up as invisible text
- [ ] Uploaded a real PDF on the deployed site and watched it reach `indexed`
- [ ] Committed after the backend

---

## As Built — 2026-08-28

Upload, status polling and the detail page work against real PDFs.

**Divergences**

- **`DocumentRow` and `DocumentStatus` are re-exported from the generated
  contract**, not declared locally. The hand-written copies had drifted quietly
  rather than failing the type check.
- The upload control still quotes a hardcoded 25 MB limit. That number is the
  unverified placeholder from Spike 2 and should come from the backend once
  measured.

**Found in use**

The document library was broken for any account with an uploaded document — the
backend listing raised on serialization. Fixed in `spec02` backend *As Built*;
worth recording here because the symptom was a blank frontend page with an
error only in the network tab.
