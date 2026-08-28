# spec04.md — Retrieval mode comparison (UI)
**Phase 4 · Backend: `edis-backend/spec/spec04.md`**
**Inherits the ground rules in `spec00.md §2`.**

---

## 1. The problem

The backend now has three retrieval modes and a threshold to choose. Choosing it from raw
JSON is possible and miserable; a comparison view makes the decision take minutes instead of
an afternoon, and leaves a screen that stays useful for every future regression.

---

## 2. Screens

`/search` gains, rather than a new route:

- a **mode selector** — vector · keyword · hybrid
- per result: fused score, **vector rank**, **keyword rank**, and raw cosine similarity
- a visual marker on the threshold: results whose cosine similarity falls below
  `RAG_MIN_SIMILARITY` are marked "below answer threshold" — **still shown, never hidden**

That last point is the whole design. Hiding weak results would remove the evidence the
threshold is chosen from, and would hide the case where *everything* is weak — which is
exactly when the system should refuse to answer.

---

## 3. Reading the screen

Showing both per-leg ranks is what makes the two legs' contributions legible: a chunk ranked
1 by keyword and 40 by vector is the exact-token case that justified adding the lexical leg.
Without both numbers, hybrid is a black box that is either better or worse and nobody can say
why.

The threshold marker must read as **informational**, not as an error. A below-threshold chunk
is a normal, correct result of a retrieval query; it simply would not license an answer.

---

## 4. Tests

| Tier | Cases |
|---|---|
| component | mode selector re-queries and re-renders; below-threshold marker appears on the right rows; per-leg ranks render as "—" when the item appeared in only one leg |

---

## 5. Definition of done

- [ ] Type check, lint, tests green
- [ ] **Clean production build**
- [ ] Types regenerated and re-exported
- [ ] Checked in a **real browser**: the threshold marker is visible against the panel
      background and does not read as an error state
- [ ] Used to run the backend's question set by hand and sanity-check the chosen threshold
- [ ] Committed after the backend

---

## As Built — 2026-08-28

Mode selector, per-leg ranks and the below-threshold marker are built and
render as specified.

**Not exercised meaningfully.** The keyword leg returns zero rows on the current
six-chunk corpus, so hybrid and vector-only produce identical output and the
comparison the screen exists for has never been made. Revisit with a real corpus.

**Divergence**

Keyword-only mode reports `similarity: 0.0`, because no query vector is computed
in that mode. The number is a placeholder rather than a measurement, and the
inspector shows it as-is.
