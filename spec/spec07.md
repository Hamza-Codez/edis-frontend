# spec07.md — Frontend Design Brief & UI Architecture
**Foundation: `rules.md` / `sops.md` / `uiux.md`**

This document serves as the foundational design contract for the EDIS frontend. All subsequent feature specifications in `spec/` must reference this document and map their components to the tokens defined here. 

Raw hex codes and arbitrary layout scales are strictly prohibited.

---

## 1. Intake Decisions (The Brief)

| Question | Decision | Implication |
| :--- | :--- | :--- |
| **Q1. Brand Seed** | `#60241E` (Primary) | Secondary colors: `#95271D`, `#B34A44`, `#E77B49`. Neutrals must be **warm (taupe/stone)** to harmonize. |
| **Q2. Typography** | Headings: **Space Grotesk**<br>Body: **Sora** | Use `next/font/google`. Tabular numerals are mandatory for tables/figures. |
| **Q3. Density** | **Moderate / Hybrid** | Control height: ~36px-40px. Row padding: ~8px-10px. Breathable but dense enough for operational tools. |
| **Q4. Shell Shape** | **Fixed Shell** | Persistent chrome (sidebar/top bar). **Exactly one scrolling content region**. Overflow handled at the root. |
| **Q5. Audiences** | **Multiple (Admins, Users)** | Requires a single label module to render role-based strings. Hidden resources must return 404, not 403. |

---

## 2. Token Architecture & Roles

All colors must be implemented as CSS variables (tokens) with alpha placeholders to allow framework opacity modifiers (e.g., `text-surface/60`). The default framework palette will be disabled.

### Generated Palette & Contrast (Measurements Required)

*Note: The following minimum contrast ratios must be verified and passing in the final CSS implementation.*

| Token Role | Purpose | Contrast Target |
| :--- | :--- | :--- |
| `canvas` | The ambient page field (warm light gray) | N/A |
| `surface` | Cards, panels, inputs (often white/near-white) | N/A |
| `overlay` | Menus, popovers, dialogs | N/A |
| `structure` | Chrome fills (sidebar, header, rails) | N/A |
| `border` | Hairlines and dividers | 3:1 (vs surface) |
| `text` | Primary body copy | 7:1 preferred, 4.5:1 required (vs canvas/surface) |
| `text-muted` | Secondary text (hints, timestamps) | **4.5:1** (vs surface) |
| `text-inverse` | Text on dark chrome | 4.5:1 |
| `text-on-accent`| Text inside a primary button | 4.5:1 (vs `#60241E`) |
| `accent` | THE call to action (`#60241E`) | N/A |
| `accent-hover` | Hover state for accent | N/A |
| `control` | Solid neutral fill for dense secondary actions | N/A |

### Reservations
1. **The accent color (`#60241E`) is exclusively for the primary call to action.** It never decorates a status, chart, or decorative fill.
2. Status colors (on-track, at-risk, overdue) are strictly for state. They never leak into charts or UI decoration.

---

## 3. Geometry & Layout Scales

### Radius
A small, strict radius scale. Never exceed the maximum.
* `none` (0px) — panels, dropdowns, table cells, dense controls
* `sm` (2-3px) — buttons, inputs, badges
* `md` (4-6px) — cards, dialogs (**Maximum rounding permitted**)
* `full` (9999px) — status dots, avatars, and count badges **ONLY**.

### Spacing & Elevation
* Derived from the "Moderate" density choice.
* Focus targets must maintain a minimum `40x40px` hit area on touch devices.
* **Borders over Shadows:** Use hairline borders to separate surfaces in the page flow. Drop shadows are strictly reserved for things that float (dialogs, portalled dropdowns).

---

## 4. Framework Config Contract

* **Scales are EXTENDED, Colors are REPLACED:** The Tailwind config will extend the spacing and radius scales but **replace** the color palette entirely with our CSS variable tokens. 
* Any use of a default Tailwind color class (e.g., `bg-blue-500` or `text-gray-300`) must fail compilation or be caught by a linter/test.

---

## 5. Required Guard Tests

Before finalizing any UI components, the following tests must be implemented:
1. **No Raw Literals:** A static analysis test that fails if `#[0-9A-Fa-f]{3,6}` is found inside component source files.
2. **Accessible Names:** Integration tests ensuring all interactive elements have accessible names naming their target.
3. **No Default Classes:** A check to ensure no default color palette classes exist in the codebase.

---

## As Built — 2026-08-28

**This is a design contract, and it is binding on the UI.** It has no backend
counterpart, so it sits outside the `specNN` pairing rule and no phase depends
on it — but that is a statement about numbering, not about authority. An earlier
note here called it "not a phase spec" and implied the shipped UI wins by
default. That was wrong, and it was written without reading the document.

### Audit against the shipped UI

Nothing in this contract was enforced by the type check or the build, and the UI
had drifted from it in three measurable ways:

| Rule | Found | Now |
|---|---|---|
| §3 `md` (4–6px) is the maximum rounding | 22 × `rounded-lg` (8px, a Tailwind default) | all `rounded-md` |
| §3 `full` is for dots, avatars and count badges only | a status pill on `rounded-full` | `rounded-sm`, the badge step |
| §3 borders over shadows, shadows only for floating things | 7 × `shadow-sm` on inline panels | removed |
| §1 Q2 tabular numerals mandatory for tables and figures | none anywhere | applied to every count, score and timestamp |
| §5.1 no raw hex in component source | none — already held | guarded |

The radius drift had a specific cause worth recording: `globals.css` sets
`--color-*: initial`, which removes Tailwind's colour palette, but does **not**
reset the radius scale. So `rounded-lg` kept resolving to the framework default
and quietly overshot the maximum this document sets. A replaced scale fails
loudly; an un-replaced one drifts silently.

### §5 guard tests — now implemented

`tests/design-contract.test.ts` covers all three the section asks for, plus the
radius and shadow rules, because those are the ones that actually broke. Six
assertions, run in the normal suite.

### Second pass — the rules a grep could not see

The first audit caught what static patterns reach. Three more required reading
the document properly:

- **§1 Q3 density.** Two controls on the Ask screen were `h-11` (44px) against a
  stated 36–40px. Both are `h-10` now. The remaining `h-14` is the header bar,
  which is chrome rather than a control.
- **§3 touch targets.** Citation chips render at 20×20px, well under the stated
  40×40 minimum. The chip stays visually small — it sits inline in a sentence and
  cannot grow — and the tappable region is expanded with an inset pseudo-element,
  so the hit area meets the rule without disturbing line spacing.
- **§1 Q5 role-based strings.** There was no label module; `role === 'admin'` was
  inlined in the layout and the document detail page. `lib/labels.ts` now owns
  navigation, the query-log scope sentence and the document-modify rule. It is
  marked UX-only in its own header, because the backend answering 404 is the
  actual guard and nothing here may become the only one.

**§5.2 accessible names** is implemented in `tests/accessible-names.test.tsx`,
separately from the static checks because a name is computed from the rendered
DOM. It caught the case it exists for: a citation chip renders as a bare digit
and announces as "1" without its `aria-label`.

### Heading colour, and why it is not the accent

Page headings are maroon, on a `heading` token rather than on `accent`. §2
reserves the accent "exclusively for the primary call to action", and a heading
on every page in that exact colour would blunt the one button that means *do
this*. The heading maroon is a step deeper — `#4A1C17` against the accent's
`#60241E` — so the button stays the brightest maroon on the page and still
reads as the action. Measured at 12.98:1 on canvas, above the 7:1 §2 prefers
for primary copy.

### Divergence: status token names

§2 names the status colours `on-track`, `at-risk`, `overdue`. They ship as
`success`, `warning`, `danger`. That vocabulary comes from a project tracker;
EDIS has no schedule, nothing is due, and a document is not overdue. The
semantic names are the same three values under names that describe what this
product actually reports. Recorded rather than silently renamed back.

### Open interpretation

§2 reserves the accent colour "exclusively for the primary call to action". The
UI also uses `accent` for citation chips, links and the active-source border.
Those are interactive controls rather than decoration, so this reads as within
the intent — but it is a broader use than the words allow, and it is recorded
here rather than settled quietly. Tighten it if the accent starts to feel cheap.

### Not verified

Every contrast ratio in §2 is still a target, not a measurement. `sops.md §6`
is explicit that this needs a real browser and computed styles, and no such
check has been run.
