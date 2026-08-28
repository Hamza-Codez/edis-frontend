import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';

/**
 * spec07 §2 — the contrast targets, measured rather than asserted.
 *
 * That table sat unverified through the whole build, and when finally measured
 * two pairs failed: muted text and the alarm colour, both against the light end
 * of the card gradient. Neither was visible on the sidebar, where the same
 * tokens sit on a much darker background — the failure only existed on one
 * surface, which is exactly the kind of thing an eyeball misses.
 *
 * Ratios are computed from globals.css, so changing a token re-runs the check.
 */

const CSS = fs.readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf-8');

function token(name: string): string {
  const match = CSS.match(new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!match) throw new Error(`token --color-${name} is not defined in globals.css`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Text on a gradient must clear the bar at its *lightest* point, not its average. */
const PAIRS: [string, string, string, number][] = [
  ['primary text on canvas', 'text', 'canvas', 4.5],
  ['muted text on surface', 'text-muted', 'surface', 4.5],
  ['button label on accent', 'text-on-accent', 'accent', 4.5],
  ['chrome text on sidebar', 'chrome-text', 'chrome', 4.5],
  ['chrome muted on sidebar', 'chrome-text-muted', 'chrome', 4.5],
  ['chrome text on card, light end', 'chrome-text', 'card-to', 4.5],
  ['chrome muted on card, light end', 'chrome-text-muted', 'card-to', 4.5],
  ['alarm figure on card, light end', 'danger-on-dark', 'card-to', 4.5],
  ['success figure on card, light end', 'success-on-dark', 'card-to', 4.5],
  ['figure on ink tile', 'chrome-text', 'ink', 4.5],
  ['label on ink tile', 'chrome-text-muted', 'ink', 4.5],
  ['alarm figure on ink tile', 'danger-on-dark', 'ink', 4.5],
  ['table head label on maroon chrome', 'chrome-text-muted', 'chrome', 4.5],
];

describe('spec07 §2 contrast targets', () => {
  it.each(PAIRS)('%s clears its target', (_label, fg, bg, target) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(target);
  });

  it('a control boundary is visible against both surfaces it can sit on', () => {
    // The edge of an input or button is a UI component, and 3:1 is the bar it
    // has to clear. This is the border that must be seen; the decorative
    // hairline between two panels is a different token and a different job.
    expect(contrast(token('control-border'), token('surface'))).toBeGreaterThanOrEqual(3);
    expect(contrast(token('control-border'), token('canvas'))).toBeGreaterThanOrEqual(3);
  });
});
