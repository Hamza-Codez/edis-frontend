# spec03.md — Retrieval inspector (UI)
**Phase 3 · Backend: `edis-backend/spec/spec03.md`**
**Inherits the ground rules in `spec00.md §2`.**

---

## 1. The problem

Retrieval is now the single highest-risk part of the system and it is invisible. Nobody can
judge whether the right chunks come back without a screen that shows exactly what came back
and how strongly.

This screen is not a stepping stone to the Q&A page — it is a permanent diagnostic. When an
answer is wrong in Phase 5, this is where you find out whether the fault was retrieval or
synthesis, in one look instead of an afternoon.

---

## 2. Screens

| Route | Rendering | Notes |
|---|---|---|
| `/search` | Client Component | Question box, ranked chunk results |

---

## 3. What a result shows

Per chunk, all of it, without truncation games:

- **similarity score, displayed numerically** — not as stars, bars or a "relevance" word.
  The number is what you will calibrate a threshold against in Phase 4, and a rounded or
  prettified version is useless for that.
- full chunk text
- source document filename, linking to `/documents/[id]`
- page range (or "section N" for DOCX)
- ordinal within the document

Results are ranked by similarity descending, exactly as the backend returned them. **Do not
re-sort or filter client-side** — the point of this screen is to show the backend's ranking,
and a client-side tweak would hide the very defect you are looking for.

---

## 4. Empty and edge states

| State | Rendering |
|---|---|
| No documents indexed yet | "No documents have finished indexing." Links to `/documents` |
| Query returns nothing | "No chunks matched." Not an error |
| Low scores across the board | Shown as-is. **No hiding of weak results** — a weak result set is the finding |

That last one matters. The instinct is to suppress results below some score for tidiness;
doing it here would remove the evidence Phase 4 needs to choose a threshold.

---

## 5. Tests

| Tier | Cases |
|---|---|
| component | results render in the order received; scores render at full precision; empty state distinguished from zero-match state |

---

## 6. Definition of done

- [ ] Type check, lint, tests green
- [ ] **Clean production build**
- [ ] Types regenerated and re-exported
- [ ] Checked in a **real browser**: long chunk text wraps and stays readable, scores are
      legible against the panel background
- [ ] Used to eyeball retrieval on real questions, feeding the backend spec03 *As Built*
- [ ] Committed after the backend

---

## As Built — 2026-08-28

The retrieval inspector renders ranked chunks with scores at full precision, in
the order the backend returned them.

**Found by wiring the generated types**

**The panel had been rendering blank text for every result.** It read
`chunk.snippet`, which belongs to `CitationChunk` — the Q&A response shape —
while `/search` returns `SearchResponseChunk`, whose field is `text`. It also
keyed rows on a non-existent `chunk_id`, so every row keyed on `undefined`.

Neither was visible until `lib/types.ts` was pointed at the generated schema and
the build failed immediately. The test fixture had been written to the same wrong
shape, so it agreed with the component and passed. The fixture is typed
`SearchResponseChunk[]` now, so it cannot drift again.

This is the screen Phase 3 depends on for judging retrieval by eye, and it was
showing nothing.
