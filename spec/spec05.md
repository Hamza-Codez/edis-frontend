# spec05.md — Answers and citations (UI)
**Phase 5 · Backend: `edis-backend/spec/spec05.md`**
**Inherits the ground rules in `spec00.md §2`.**

---

## 1. The problem

This is the screen the whole project is for. It has one job beyond showing an answer: making
the *evidence* as prominent as the prose, so a reader can check a claim in one click instead
of trusting it.

A grounded system whose UI buries its citations is, to its user, indistinguishable from one
that hallucinates.

---

## 2. Screens

| Route | Rendering | Notes |
|---|---|---|
| `/ask` | Client Component | Question box, answer, evidence panel |

---

## 3. The answer

Rendered claim by claim, as the backend returns it — **not concatenated into a paragraph.**
The structure is the guarantee: each claim carries its own citations, and flattening the
claims into prose loses which citation belongs to which sentence, which is the entire point.

Each claim shows inline citation chips (`[1]`, `[2]`). Hovering or focusing a chip highlights
the corresponding entry in the evidence panel; activating it scrolls to and expands that
entry.

---

## 4. The evidence panel

One entry per cited chunk: full chunk text, source filename linking to `/documents/[id]`,
page range (or "section N" for DOCX), and similarity score.

**Full chunk text, not a truncated preview.** A snippet short enough to be tidy is short
enough to hide the qualifying clause that changes the meaning — and verifying the claim is
what this panel is for.

Chunks whose document has since been deleted render as "the source document has been
removed", because the query log deliberately keeps ids without a foreign key. Not an error
state; a factual one.

---

## 5. The refusal state

When `outcome` is `insufficient_context`, the backend's `message` is rendered in a state that
is **visually distinct from an answer** — different container, different treatment, obviously
not prose the system is asserting.

This is the single most important rendering decision on the page. A refusal styled like an
answer is read as an answer. It must be unmistakable, and it must not be styled as an error
either: the system worked correctly and is telling the truth about what it does not know.

Show the question back, and the suggestion from the backend's message verbatim. **Do not
paraphrase it** — it names the remedy deliberately.

---

## 6. Progress

The answer is not streamed, by design (`spec05.md` backend §4). Cover the latency by showing
the pipeline stage: `retrieving` → `synthesising` → `verifying`.

**Do not add token streaming.** It would require publishing claims before the backend has
validated them, which is the invariant the entire system is built around.

Submit is disabled while a request is in flight.

---

## 7. Tests

| Tier | Cases |
|---|---|
| component | claims render individually with their own chips; a chip activates the right evidence entry; `insufficient_context` renders the refusal container, never the answer container; deleted-source chunk renders its fallback text |
| guard | no code path concatenates `claims[].text` into a single string |

---

## 8. Definition of done

- [ ] Type check, lint, tests green
- [ ] **Clean production build**
- [ ] Types regenerated and re-exported
- [ ] Checked in a **real browser, measuring computed styles**: the refusal container is
      visually distinct from the answer container, and citation chips are legible against
      both. This is precisely where a dropped opacity modifier or a default-palette class
      ships as invisible text
- [ ] On the deployed site: a corpus question renders with working citations; an out-of-corpus
      question renders the refusal
- [ ] Committed after the backend

---

## 9. As Built

*Amend after implementation.*
