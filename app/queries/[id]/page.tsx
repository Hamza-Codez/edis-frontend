'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import type { QueryDetailResponse } from '@/lib/types';
import { OutcomeBadge } from '../page';

/**
 * Enough to reconstruct why an answer came out as it did, without opening a
 * database client: the question, the gate's input, what was retrieved, what the
 * model returned, and what it cost.
 */
export default function QueryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [row, setRow] = useState<QueryDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchApi<QueryDetailResponse>(`/queries/${id}`)
      .then((data) => !cancelled && setRow(data))
      .catch((e: unknown) =>
        !cancelled && setError(e instanceof Error ? e.message : 'Could not load this query.')
      );
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <Link
        href="/queries"
        className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
      >
        <ArrowLeft size={14} /> Query log
      </Link>

      {error && (
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3 text-danger">
          {error}
        </div>
      )}

      {row && (
        <>
          <header className="space-y-3">
            <h1 className="font-space-grotesk text-xl font-bold text-heading">{row.question}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
              <OutcomeBadge outcome={row.outcome} />
              <span>{new Date(row.created_at).toLocaleString()}</span>
              {row.llm_model && <span className="font-mono">{row.llm_model}</span>}
            </div>
          </header>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
            <Field
              label="Top similarity"
              value={row.top_similarity === null ? '—' : row.top_similarity.toFixed(4)}
              hint="what the gate read"
            />
            <Field label="Passages" value={String(row.retrieved_chunk_ids.length)} hint="retrieved" />
            <Field
              label="Tokens"
              value={
                row.prompt_tokens || row.completion_tokens
                  ? `${row.prompt_tokens ?? 0} / ${row.completion_tokens ?? 0}`
                  : '—'
              }
              hint="in / out"
            />
            <Field
              label="Latency"
              value={row.latency_ms === null ? '—' : `${row.latency_ms} ms`}
              hint="model call"
            />
          </dl>

          {row.outcome === 'insufficient_context' && !row.answer_json && (
            <p className="rounded-md border border-dashed border-border bg-structure/50 px-4 py-3 text-sm text-text-muted">
              Below the confidence threshold, so the model was never called. No tokens were spent.
            </p>
          )}

          <section className="space-y-2">
            <h2 className="font-space-grotesk font-bold text-text">Retrieved passages</h2>
            <p className="text-xs text-text-muted">
              Recorded as ids without a foreign key, so the log survives the documents it
              references. An id here may no longer exist.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {row.retrieved_chunk_ids.map((chunkId) => (
                <span
                  key={chunkId}
                  className="rounded bg-control px-2 py-0.5 font-mono text-xs text-text-muted"
                >
                  #{chunkId}
                </span>
              ))}
              {row.retrieved_chunk_ids.length === 0 && (
                <span className="text-sm text-text-muted">None.</span>
              )}
            </div>
          </section>

          {row.answer_json && (
            <section className="space-y-2">
              <h2 className="font-space-grotesk font-bold text-text">Model output</h2>
              <p className="text-xs text-text-muted">
                Exactly what the model returned, before validation. For a rejected answer this is
                where the invented citation is visible.
              </p>
              <pre className="overflow-x-auto rounded-md border border-border bg-structure p-4 text-xs leading-relaxed text-text">
                {JSON.stringify(row.answer_json, null, 2)}
              </pre>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <div className="font-mono text-sm tabular-nums text-text">{value}</div>
      <div className="text-xs font-medium text-text">{label}</div>
      <div className="text-xs text-text-muted">{hint}</div>
    </div>
  );
}
