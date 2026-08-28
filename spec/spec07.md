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

## Status — 2026-08-28

**This is a design brief, not a phase spec.** It has no backend counterpart and
does not follow the `specNN` pairing rule, so it carries no *As Built* section
and no phase depends on it.

Where it and the shipped UI disagree, the shipped UI wins and the divergence is
recorded in the *As Built* of the spec that owns the screen. The design tokens
it describes live in `app/globals.css`, which is authoritative — note that
`--color-*: initial` there removes Tailwind's default palette entirely, so any
colour named in this document must exist as a token or it compiles to nothing.
