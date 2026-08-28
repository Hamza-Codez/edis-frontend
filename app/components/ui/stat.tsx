import type { ReactNode } from 'react';

type Tone = 'ink' | 'card' | 'surface';

const TONES: Record<Tone, { wrap: string; figure: string; label: string; hint: string }> = {
  ink: {
    wrap: 'bg-ink border-ink-border divide-ink-border',
    figure: 'text-chrome-text',
    label: 'text-chrome-text',
    hint: 'text-chrome-text-muted',
  },
  card: {
    wrap: 'card-maroon border-card-border divide-chrome-border',
    figure: 'text-chrome-text',
    label: 'text-chrome-text',
    hint: 'text-chrome-text-muted',
  },
  surface: {
    wrap: 'bg-surface border-border divide-border',
    figure: 'text-text',
    label: 'text-text',
    hint: 'text-text-muted',
  },
};

/**
 * Figures, with `tabular-nums` baked in rather than left to each caller.
 *
 * spec07 §1 Q2 makes tabular numerals mandatory for figures, and the audit that
 * added that rule found zero uses of it anywhere. Putting it here is what stops
 * the next figure drifting — proportional digits jitter between polls, which
 * makes a changing count look like a rendering fault.
 */
export function StatGrid({
  columns = 3,
  tone = 'ink',
  className = '',
  children,
}: {
  columns?: 2 | 3 | 4;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  const cols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[columns];
  return (
    <div
      data-tone={tone}
      className={`grid ${cols} divide-x overflow-hidden rounded-md border ${TONES[tone].wrap} ${className}`}
    >
      {children}
    </div>
  );
}

/** Stacked rows rather than columns, for the 360px rail. */
export function StatStack({
  tone = 'ink',
  className = '',
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-tone={tone}
      className={`divide-y overflow-hidden rounded-md border ${TONES[tone].wrap} ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  alarming = false,
  tone = 'ink',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  alarming?: boolean;
  tone?: Tone;
}) {
  const t = TONES[tone];
  const alarmColour = tone === 'surface' ? 'text-danger' : 'text-danger-on-dark';
  return (
    <div className="px-4 py-3">
      <div
        className={`font-space-grotesk text-2xl font-bold tabular-nums ${
          alarming ? alarmColour : t.figure
        }`}
      >
        {value}
      </div>
      <div className={`text-sm font-medium ${t.label}`}>{label}</div>
      {hint && <div className={`text-xs ${t.hint}`}>{hint}</div>}
    </div>
  );
}

/** A label/value row for dense readouts, where a 2xl figure would be too loud. */
export function StatRow({
  label,
  value,
  tone = 'ink',
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  const t = TONES[tone];
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2">
      <span className={`text-xs ${t.hint}`}>{label}</span>
      <span className={`font-mono text-sm tabular-nums ${t.figure}`}>{value}</span>
    </div>
  );
}
