'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import type { CurrentUser, QueryResponse } from '@/lib/types';
import { queryScopeLabel } from '@/lib/labels';

/** How many rows the mix is computed over. Labelled on screen, because a rate
 *  computed from a capped window and presented as "the" rate is a lie. */
const WINDOW = 200;

type Outcome = 'answered' | 'insufficient_context' | 'ungrounded_rejected' | 'upstream_error';

/**
 * spec06 §3 — these four numbers are the health of the system.
 *
 * `insufficient_context` is deliberately NOT alarming: it is the system working
 * as designed. `ungrounded_rejected` is, because it means the model returned
 * citations it was never given.
 */
const OUTCOMES: { key: Outcome; label: string; meaning: string; alarming: boolean }[] = [
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

export default function QueriesPage() {
  const [rows, setRows] = useState<QueryResponse[] | null>(null);
  const [role, setRole] = useState<CurrentUser['role'] | null>(null);
  const [filter, setFilter] = useState<Outcome | 'all'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchApi<QueryResponse[]>(`/queries?limit=${WINDOW}`)
      .then((data) => !cancelled && setRows(data))
      .catch((e: unknown) =>
        !cancelled && setError(e instanceof Error ? e.message : 'Could not load queries.')
      );
    // The backend already scopes the rows; this only decides how the heading
    // describes them, so a member is never told they are seeing everything.
    fetchApi<CurrentUser>('/auth/me')
      .then((me) => !cancelled && setRole(me.role))
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows ?? []) map.set(row.outcome, (map.get(row.outcome) ?? 0) + 1);
    return map;
  }, [rows]);

  const visible = useMemo(
    () => (rows ?? []).filter((r) => filter === 'all' || r.outcome === filter),
    [rows, filter]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <header className="space-y-1">
        <h1 className="font-space-grotesk text-2xl font-bold text-text">Query log</h1>
        <p className="text-sm text-text-muted">
          {role ? queryScopeLabel(role) : 'Your questions.'} What the system did with
          each, and why. Append-only.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3 text-danger">
          {error}
        </div>
      )}

      <section className="space-y-2">
        <div className="grid gap-3 sm:grid-cols-4">
          {OUTCOMES.map(({ key, label, meaning, alarming }) => {
            const count = counts.get(key) ?? 0;
            const highlight = alarming && count > 0;
            return (
              <button
                key={key}
                type="button"
                data-testid={`tile-${key}`}
                onClick={() => setFilter(filter === key ? 'all' : key)}
                className={`card-maroon rounded-md border p-4 text-left focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas focus:outline-none ${
                  filter === key ? 'border-chrome-text' : 'border-card-border hover:border-chrome-text-muted'
                }`}
              >
                <div
                  className={`font-space-grotesk text-2xl font-bold tabular-nums ${
                    highlight ? 'text-danger-on-dark' : 'text-chrome-text'
                  }`}
                >
                  {rows ? count : '—'}
                </div>
                <div className="text-sm font-medium text-chrome-text">{label}</div>
                <div className="mt-1 text-xs leading-snug text-chrome-text-muted">{meaning}</div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-text-muted">
          Across the {rows ? rows.length : 0} most recent queries
          {rows && rows.length === WINDOW ? ` (capped at ${WINDOW})` : ''}. Click a tile to filter.
        </p>
      </section>

      <section className="overflow-hidden rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-chrome-border bg-chrome text-left text-xs text-chrome-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Question</th>
              <th className="px-4 py-2 font-medium">Outcome</th>
              <th className="px-4 py-2 font-medium">Top sim</th>
              <th className="px-4 py-2 font-medium">Tokens</th>
              <th className="px-4 py-2 font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!rows && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {rows && visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  {rows.length === 0 ? 'No questions asked yet.' : 'No queries with that outcome.'}
                </td>
              </tr>
            )}
            {visible.map((row) => (
              <tr key={row.id} className="hover:bg-structure/60">
                <td className="max-w-md truncate px-4 py-2">
                  <Link href={`/queries/${row.id}`} className="text-accent hover:underline">
                    {row.question}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <OutcomeBadge outcome={row.outcome} />
                </td>
                <td className="px-4 py-2 font-mono text-xs tabular-nums text-text-muted">
                  {row.top_similarity === null ? '—' : row.top_similarity.toFixed(3)}
                </td>
                <td className="px-4 py-2 font-mono text-xs tabular-nums text-text-muted">
                  {row.prompt_tokens || row.completion_tokens
                    ? `${row.prompt_tokens ?? 0}/${row.completion_tokens ?? 0}`
                    : '—'}
                </td>
                <td className="px-4 py-2 text-xs tabular-nums text-text-muted">
                  {new Date(row.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

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
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${tone}`}>
      {spec?.label ?? outcome}
    </span>
  );
}
