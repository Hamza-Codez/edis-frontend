/**
 * The four query outcomes — spec06 §3.
 *
 * Moved here from `app/queries/page.tsx`: importing a component out of a
 * `page.tsx` makes the route module a dependency of anything that renders the
 * badge, which is a Next anti-pattern and blocked /ask from reusing it.
 *
 * `insufficient_context` is deliberately NOT alarming. It is the system working
 * as designed, and styled as an error it reads as a fault — which invites
 * someone to weaken the gate that produces it.
 */
export type OutcomeKey =
  | 'answered'
  | 'insufficient_context'
  | 'ungrounded_rejected'
  | 'upstream_error';

export const OUTCOMES: {
  key: OutcomeKey;
  label: string;
  meaning: string;
  alarming: boolean;
}[] = [
  {
    key: 'answered',
    label: 'Answered',
    meaning: 'supported by retrieved passages',
    alarming: false,
  },
  {
    key: 'insufficient_context',
    label: 'Refused',
    meaning: 'nothing matched strongly enough — working as designed',
    alarming: false,
  },
  {
    key: 'ungrounded_rejected',
    label: 'Rejected',
    meaning: 'model cited something it was not given; answer discarded',
    alarming: true,
  },
  {
    key: 'upstream_error',
    label: 'Provider error',
    meaning: 'unavailable, rate limited, or ignoring the schema',
    alarming: true,
  },
];

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const spec = OUTCOMES.find((o) => o.key === outcome);
  const tone = !spec
    ? 'bg-control text-text-muted'
    : spec.alarming
      ? 'bg-danger/10 text-danger'
      : outcome === 'answered'
        ? 'bg-success/10 text-success'
        : 'bg-control text-text-muted';
  return (
    <span className={`inline-flex rounded-sm px-2 py-0.5 text-xs font-medium ${tone}`}>
      {spec?.label ?? outcome}
    </span>
  );
}
