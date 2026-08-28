import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';

/**
 * The guard tests spec07 §5 requires.
 *
 * spec07 is a design contract with no backend counterpart, so nothing about it
 * is enforced by the type check or the build. Without these it is a document
 * describing a system that drifted away from it — which is exactly what
 * happened: 22 uses of a radius above the permitted maximum, 7 drop shadows on
 * things that do not float, and no tabular numerals anywhere.
 */

const APP = path.join(process.cwd(), 'app');

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function offenders(pattern: RegExp): string[] {
  const found: string[] = [];
  for (const file of sources(APP)) {
    const text = fs.readFileSync(file, 'utf-8');
    text.split('\n').forEach((line, i) => {
      const match = line.match(pattern);
      if (match) found.push(`${path.relative(process.cwd(), file)}:${i + 1}  ${match[0]}`);
    });
  }
  return found;
}

describe('spec07 design contract', () => {
  it('§5.1 — no raw colour literals in component source', () => {
    // Colours belong in globals.css as tokens. A hex in a component cannot be
    // themed, cannot be contrast-checked, and will not move when the palette does.
    expect(offenders(/#[0-9A-Fa-f]{3,8}\b/)).toEqual([]);
  });

  it('§5.3 — no default Tailwind palette classes', () => {
    // globals.css sets `--color-*: initial`, so these compile to nothing at all.
    // The failure is invisible: text turns the colour it inherits, and controls
    // vanish against their background.
    const palette =
      'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
    expect(offenders(new RegExp(`\\b(bg|text|border|ring|divide)-(${palette})-[0-9]{2,3}\\b`))).toEqual(
      []
    );
  });

  it('§3 — radius never exceeds md, the permitted maximum', () => {
    // The colour scale was replaced but the radius scale was not, so rounded-lg
    // and above still resolve to Tailwind defaults and silently overshoot.
    expect(offenders(/\brounded(-[a-z]+)?-(lg|xl|2xl|3xl)\b/)).toEqual([]);
  });

  it('§3 — rounded-full is reserved for dots, avatars and count badges', () => {
    // Everything else, badges included, is on the sm step.
    expect(offenders(/\brounded-full\b/)).toEqual([]);
  });

  it('§3 — borders over shadows: nothing inline may cast one', () => {
    // Drop shadows are reserved for things that float. Nothing in this app
    // portals or overlays yet, so any shadow is decoration.
    expect(offenders(/\bshadow-(sm|md|lg|xl|2xl)\b/)).toEqual([]);
  });

  it('§1 Q2 — figures and table cells use tabular numerals', () => {
    // Proportional digits jitter between rows and between polls, which makes a
    // changing count look like a rendering fault.
    const numericScreens = ['queries/page.tsx', 'components/corpus-summary.tsx'];
    for (const rel of numericScreens) {
      const text = fs.readFileSync(path.join(APP, rel), 'utf-8');
      expect(text).toContain('tabular-nums');
    }
  });
});
