'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import type { DocumentResponse } from '@/lib/types';

type Counts = { indexed: number; processing: number; failed: number };

/**
 * What the corpus can actually answer from, stated as a number.
 *
 * Only `indexed` documents are searchable, so a user with five uploads and none
 * indexed would otherwise be told nothing supports an answer and have no way to
 * see why.
 */
export function CorpusSummary() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchApi<{ items: DocumentResponse[] }>('/documents')
      .then(({ items }) => {
        if (cancelled) return;
        setCounts({
          indexed: items.filter((d) => d.status === 'indexed').length,
          processing: items.filter(
            (d) => d.status !== 'indexed' && d.status !== 'failed'
          ).length,
          failed: items.filter((d) => d.status === 'failed').length,
        });
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || !counts) {
    return <div className="h-[74px] rounded-md border border-ink-border bg-ink opacity-40" />;
  }

  const empty = counts.indexed === 0 && counts.processing === 0 && counts.failed === 0;
  if (empty) {
    return (
      <div className="rounded-md border border-dashed border-border bg-structure/50 px-5 py-4 text-sm text-text-muted">
        No documents yet. <Link href="/documents" className="text-accent hover:underline">
          Upload one
        </Link>{' '}
        to start asking questions.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 divide-x divide-ink-border overflow-hidden rounded-md border border-ink-border bg-ink">
      <Stat label="Searchable" value={counts.indexed} hint="ready to answer from" />
      <Stat label="Processing" value={counts.processing} hint="not yet searchable" />
      <Stat
        label="Failed"
        value={counts.failed}
        hint={counts.failed > 0 ? 'see Documents for why' : 'none'}
        alarming={counts.failed > 0}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  alarming = false,
}: {
  label: string;
  value: number;
  hint: string;
  alarming?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <div
        className={`font-space-grotesk text-2xl font-bold tabular-nums ${
          alarming ? 'text-danger-on-dark' : 'text-chrome-text'
        }`}
      >
        {value}
      </div>
      <div className="text-sm font-medium text-chrome-text">{label}</div>
      <div className="text-xs text-chrome-text-muted">{hint}</div>
    </div>
  );
}
