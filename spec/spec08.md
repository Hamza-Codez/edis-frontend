# spec08.md — Dense Ask and Search, and a shared UI vocabulary (UI)
**Phase 8 · Backend: `edis-backend/spec/spec08.md`**
**Inherits the ground rules in `spec00.md §2` and the design contract in `spec07.md`.**

---

## 1. The problem

`/ask` and `/search` are top-anchored `max-w-4xl` stacks inside a content region
that is **1136 × (100vh − 104px)**. Neither has an idle state: on first arrival a
user sees a header, a form, and then roughly 85% empty canvas. They read as
unfinished — and on `/search`, the emptiness hides that it is the most useful
diagnostic screen in the product.

Measuring for the redesign surfaced three live defects. They are why this is a
fix and not a coat of paint.

### 1.1 `text-warning` fails contrast everywhere it is used

`#B8860B` measures **3.25:1** on `surface`, **2.96:1** on `canvas` and
**2.65:1** on `structure`, against the 4.5:1 `spec07 §2` requires. It is rendered
on `bg-warning/10`, a near-white background. `tests/contrast.test.ts` missed it
only because the pair was not in `PAIRS`.

### 1.2 Keyword mode marks every result below threshold

`edis-backend/app/routers/search.py` sets `similarity = literal(0.0)` when no
query vector is computed, which is every keyword search. The page marks any row
under the threshold, so **all ten results carry the warning, every time**. The
diagnostic screen lies on one of its three modes.

### 1.3 The threshold is invented

Covered by the backend counterpart. The slider defaults to `0.5` against a
deployed gate of `0.55`, and a user-adjustable control implies the gate is a
preference.

---

## 2. Layout

Both pages replace `max-w-4xl` with:

```
grid min-h-full grid-cols-[minmax(0,1fr)_360px] gap-x-6 gap-y-4
grid-rows-[auto_auto_1fr] content-start
```

Three details are load-bearing and each has a failure mode worth naming:

- **`minmax(0,1fr)`, never `1fr`.** Grid items default to `min-width:auto`. A
  chunk rendered `whitespace-pre-wrap` containing one long unbroken token will
  push the column past 1136px and produce horizontal page scroll. This is the
  most likely regression in the whole phase.
- **`content-start`.** `align-content` defaults to `stretch`, which inflates
  every auto row to fill `min-h-full`. That is precisely how a page becomes
  *padded* rather than dense. Residual space is filled by a deliberate element
  in the `1fr` row — never by stretching a panel.
- **`main` remains the only vertically scrolling region** (`spec07 §1 Q4`).
  Sticky elements anchor to `main`, which is already `relative`.

The main column resolves to **752px**, about 85 characters at 15px Sora — the
right measure for passage text. The rail is **360px** on both pages so the two
screens read as one instrument rather than two designs.

**Sticky rule: only pin bounded content.** A sticky block taller than the
scrollport has an unreachable bottom. Every rail below has a fixed row count.

### 2.1 `/ask`

| State | Column 1 | Column 2 (rail) |
|---|---|---|
| Idle | Sticky composer; `Panel` **In scope right now** (5 indexed documents — filename, page and chunk counts, link); `Panel` **Getting an answer worth trusting** (3 vague→specific rewrite pairs) | `CorpusSummary` stacked; `Panel` **Recent questions** (5 rows, click fills the composer) |
| Loading | Skeleton shaped like the answer: three text lines, then two collapsed source bars. The existing `role="status"` line stays verbatim | unchanged — still true |
| Answered | Claims and Sources exactly as today; only the wrapper geometry changes | Sticky receipt: outcome, question echoed, 3-cell `StatGrid` (claims / passages / top similarity), cited documents with jump buttons, **Open the full record →** to `/queries/{query_id}` |
| Refused | Refusal container unchanged — dashed, deliberately not an error — plus **Inspect retrieval for this question →** to `/search?q=…` | **Why this happened**: the four-step production sequence and the corpus stack |

**The rewrite-pairs panel earns its place**: the fallback sentence tells users to
"try rephrasing using terms that would appear in the source text". That is the
only place in the product where that instruction becomes actionable.

**`query_id` is returned by `/qa/ask` today and discarded.** Linking it is one
line and is the strongest verifiability affordance available — it reaches the
raw model output and the retrieved chunk ids.

A full-width band across the `1fr` row **in idle only** — *How an answer is
produced*, the four steps currently on the dashboard. Hidden once a result
exists: it is orientation, not furniture.

### 2.2 `/search`

Sticky query bar: question field · **mode as a segmented control** · **limit
segmented 10 / 25 / 50** · submit. **The threshold slider is deleted.**

Mode moves out of a `<select>` because three options that change the meaning of
every number below deserve to be visible. Limit exists because the endpoint
accepts 1–100 while the page hardcodes 10 — so "does the chunk I expect appear
at rank 34?" cannot currently be asked, and that is the question this screen is
for.

Each result is a `Panel` with a **mode-aware** metric group. This is §1.2's fix:

| Mode | Metrics shown | Threshold marker |
|---|---|---|
| hybrid | `score` (4dp) labelled *RRF · max 0.0328*, `V n`, `K n`, `cos`; a **keyword only** / **vector only** tag when a leg rank is null | yes, against `min_similarity` |
| vector | `cos` only — `score` is null, so render no empty slot | yes |
| keyword | `ts_rank order` and **`cos —`**, titled "not computed in keyword mode" | **never** |

The leg tag is the exact-token insight `spec04 §3` says this screen exists to
expose, extracted from data hybrid already returns — no extra request.

Body keeps **full text, never truncated** (`spec04 §2`: weak results are shown,
never hidden). A **rank delta against the previous run** (`↑4 vs hybrid`, keyed
on `document_id` + `ordinal`) gives mode comparison for zero extra requests.

Rail: run summary `StatGrid` · **the gate**, stated exactly from
`min_similarity` · **Reading this screen** legend, including one flat sentence
that the RRF score is rank-derived and is **not** a confidence · **Ask this
question →**.

Idle fills column 1 with *What each mode ranks by* and *Recent questions*.

**Cross-links prefill only, never auto-submit.** A page that fires a paid
request from a URL loops on refresh and fires on link prefetch.

---

## 3. Shared vocabulary

Six screens each hand-rolled a header, a card, a button and an error banner. The
`/ask` and `/search` error banners already differed while saying the same thing.

New under `app/components/ui/`, so `tests/design-contract.test.ts` scans them.
Tests stay in `tests/` — `tests/guard.test.ts` forbids test files inside `app/`.

| Component | Note |
|---|---|
| `Panel` | The one container. Radius `md` per `spec07 §3`; separation by border and a `structure`-toned header, never a shadow |
| `Button` | **Discriminated union**: visible children, *or* an icon plus a required `aria-label`. This makes the accessible-name rule a **compile error** rather than something `accessible-names.test.tsx` can only catch once a screen renders |
| `QuestionField` | Two inputs existed, differing in height, background and radius, on the two screens users most compare |
| `ErrorBanner` | `role="alert"`, replacing four near-copies |
| `Stat` / `StatGrid` / `StatStack` / `StatRow` | `tabular-nums` **baked in**, so the next figure cannot drift |
| `EmptyState`, `Skeleton`, `PageHeader` | — |
| `OutcomeBadge` | **Moved** out of `app/queries/page.tsx`. Importing a component from a `page.tsx` makes the route module a dependency of every consumer |

Plus `use-documents.ts` — a module-scoped in-flight promise so `CorpusSummary`
and *In scope right now* on the same page make **one** request — and
`recent-questions.tsx`.

Buttons and inputs sit on the **`sm`** radius step; cards on `md`. The existing
radius guard only bans anything *above* `md`, so this distinction is otherwise
invisible and is asserted separately.

Other pages keep their markup and migrate later.

---

## 4. Adopting `ConfirmModal`

A `ConfirmModal` arrived alongside this work, replacing browser `confirm()` in
the reindex, delete, document-list and user-management flows. It is adopted, not
rewritten — it is better than a native dialog, which cannot be styled, cannot
carry a filename safely, and reads as a browser artefact.

Four defects to fix on adoption:

1. **`text-white` on both action buttons.** `--color-*: initial` wipes `white`,
   so the label compiles to **nothing** — an invisible label on a coloured
   button. Use `text-text-on-accent`. This is the third recurrence of this exact
   failure, which is why §6 adds a guard for it.
2. **`hover:bg-[#993F3A]`** — a raw hex in component source, banned by
   `spec07 §5.1`, and an arbitrary value that bypasses the token vocabulary
   entirely. Needs a `--color-danger-hover` token.
3. **`Enter` confirms while the dialog is open, from anywhere.** On a
   destructive dialog that deletes a document, a keystroke aimed at the page
   behind it destroys data. Escape-to-cancel stays; **Enter-to-confirm goes**.
   Confirmation should require the button.
4. **No focus management.** Focus stays behind the dialog, so a keyboard user is
   tabbing through the page underneath an `aria-modal`. Move focus to the cancel
   control on open — cancel, not confirm, so a stray Enter or Space is safe.

**`shadow-xl` stays.** `spec07 §3` reserves shadows for "things that float
(dialogs, portalled dropdowns)", and a modal is the stated exception. The
existing guard test bans shadows outright, which is stricter than the contract:
**the test is wrong, not the component**, and §6 narrows it.

---

## 5. What must not be built

Ordered by how strongly each suggests itself.

1. **No "answer anyway" or "lower the threshold" on the refusal screen.** The
   most obvious feature here and a direct attack on Invariant 2. The refusal is
   deterministic and server-side; a control implying otherwise teaches users the
   guarantee is negotiable. **Its absence is asserted in a test.**
2. **No user-set threshold under any name.** It changes nothing the server does.
3. **No confidence percentage or meter.** Cosine is not calibrated probability,
   and the RRF score is rank-derived — it maxes at 0.0328 and cannot express
   confidence.
4. **No copy-answer that flattens claims.** The per-claim structure *is* the
   guarantee; a guard already forbids concatenating `claims[].text`.
5. **No regenerate, top-k or temperature control.** `/qa/ask` accepts
   `{question}` and nothing else; a control pretending otherwise is fiction.
6. **No streaming or fabricated pipeline stages.** Validation runs after the
   model finishes and a streamed answer cannot be withdrawn.
7. **No client-side re-sort of results.** The order received *is* the finding.
8. **No localStorage saved questions.** A second history invisible to the audit
   log is the wrong trade for a compliance tool.
9. **No tri-mode "compare all three".** Triples requests and doubles embedding
   spend; the leg tags deliver the insight free.

---

## 6. Tests

**Tokens and guards land before any layout moves**, so the suite is green
throughout.

- **`contrast.test.ts`** — add `--color-warning-surface` / `--color-warning-strong`
  and `--color-danger-hover`; extend `PAIRS` with the warning pairs and with
  `text` / `text-muted` / `accent` on `structure`, which go live once panels use
  a `structure` header.
- **`design-contract.test.ts`** — extend, never relax:
  - **Wiped base colours.** `text-white`, `bg-black`, `border-transparent` and
    friends resolve to nothing once `--color-*: initial` runs. The palette guard
    matches `text-<name>-<number>` and cannot see them. This has now shipped
    three times; it gets its own assertion.
  - **Single vertical scroll region** — `overflow-y-auto|scroll` and unqualified
    `overflow-auto` banned outside `layout.tsx`. Horizontal overflow is
    **allowed**: a wide table or JSON block must scroll inside its own container
    or the page scrolls sideways.
  - **Control height band** — `h-11`..`h-14` banned outside `layout.tsx`, whose
    `h-14` header is chrome rather than a control.
  - **Shadows** — narrowed from an outright ban to "banned except in components
    that float", matching `spec07 §3`.
  - Buttons and inputs assert `rounded-sm`.
- **`search.test.tsx`** — **a deliberate rewrite.** It currently asserts
  `Score: 0.033`, `Raw: 0.8123456789` and a `Below Answer Threshold` derived from
  the 0.5 slider. Most of those strings *are* the defects being fixed; bending
  the design to preserve them would preserve the bugs. New cases: keyword mode
  produces zero markers and `cos —`; hybrid renders leg ranks and the only-found-by
  tag; the marker uses the API's `min_similarity`; a mode switch issues exactly
  two requests; zero-match stays distinct from idle.
- **`ask.test.tsx`** — all six existing cases keep passing. The
  `"retention periods"` placeholder and the `/^ask$/i` button name are preserved
  deliberately; two test files match on them. Add: idle renders scope and recent
  questions; **the invariant guard** — no control matching
  `answer anyway|lower.*threshold|force` exists on the refusal screen; the
  receipt links `/queries/{query_id}`; `?q=` prefills **without** firing a request.
- **`confirm-modal.test.tsx`** — new: Escape cancels; **Enter does not confirm**;
  focus lands on cancel when it opens; the confirm label is visible (not a wiped
  token).
- **`ui-primitives.test.tsx`** — an icon-only `Button` without `aria-label` fails
  type-check; `ErrorBanner` exposes `role="alert"`; `Stat` carries `tabular-nums`.

**Not automatable in jsdom:** sticky offsets, the 1136px fill, and whether the
pinned bar actually occludes. Verify in a real browser per `spec07 §2.7` and
record it in As Built.

---

## 7. Definition of done

- [ ] Backend `spec08` merged and deployed first; contract regenerated
- [ ] Type check, lint, tests green
- [ ] **Clean production build** — `.next/` and `tsconfig.tsbuildinfo` removed
      first, no dev server running
- [ ] Checked in a **real browser** at 1440, 1280 and 1024: no horizontal
      scroll, one scrollbar, the rail does not crush the passage column, and the
      sticky bar occludes rather than blends
- [ ] A keyword search shows **zero** threshold markers
- [ ] A refusal offers no way to override the gate
- [ ] Both specs amended with *As Built*

---

## 8. As Built

- `ConfirmModal` refactored as per spec08 with focus management and token alignment.
- Added `min_similarity` integration from backend in `/search`. Redesigned layout with `grid-cols-12`, a sticky 4-col query panel with `SegmentControl`, removed threshold slider, and computed rank deltas.
- Redesigned `/ask` layout to use a 12-col grid. Implemented an idle state with `CorpusSummary` and `RecentQuestions` in the left panel. Added a "Receipt" rail for answered queries and removed all bypass controls from the refusal screen.
- Maintained design contract invariants with appropriate `rounded-sm`/`md` usage and valid base colors across components.
