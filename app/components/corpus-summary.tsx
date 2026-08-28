'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDocuments } from '@/app/hooks/use-documents';
import { StatGrid, StatStack, Stat } from './ui/stat';

type Counts = { indexed: number; processing: number; failed: number };

/**
 * What the corpus can actually answer from, stated as a number.
 *
 * Only `indexed` documents are searchable, so a user with five uploads and none
 * indexed would otherwise be told nothing supports an answer and have no way to
 * see why.
 */
export function CorpusSummary({ layout = 'grid' }: { layout?: 'grid' | 'stack' }) {
  const { documents, failed } = useDocuments();

  if (failed || !documents) {
    return <div className="h-[74px] rounded-md border border-ink-border bg-ink opacity-40" />;
  }

  const counts = {
    indexed: documents.filter((d) => d.status === 'indexed').length,
    processing: documents.filter(
      (d) => d.status !== 'indexed' && d.status !== 'failed'
    ).length,
    failed: documents.filter((d) => d.status === 'failed').length,
  };

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

  if (layout === 'stack') {
    return (
      <StatStack tone="surface">
        <Stat label="Searchable" value={counts.indexed} hint="ready to answer from" />
        <Stat label="Processing" value={counts.processing} hint="not yet searchable" />
        <Stat
          label="Failed"
          value={counts.failed}
          hint={counts.failed > 0 ? 'see Documents for why' : 'none'}
          alarming={counts.failed > 0}
        />
      </StatStack>
    );
  }

  return (
    <div className="flex items-center justify-around rounded-md bg-gradient-to-r from-black via-zinc-900 to-zinc-700 border border-border py-3 px-2 shadow-md">
      <div className="text-center px-3 border-r border-zinc-600 flex-1">
        <div className="text-2xl font-space-grotesk font-bold text-white tabular-nums leading-none mb-1">{counts.indexed}</div>
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Searchable</div>
      </div>
      <div className="text-center px-3 border-r border-zinc-600 flex-1">
        <div className="text-2xl font-space-grotesk font-bold text-white tabular-nums leading-none mb-1">{counts.processing}</div>
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Processing</div>
      </div>
      <div className="text-center px-3 flex-1">
        <div className={`text-2xl font-space-grotesk font-bold tabular-nums leading-none mb-1 ${counts.failed > 0 ? 'text-red-400' : 'text-white'}`}>
          {counts.failed}
        </div>
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Failed</div>
      </div>
    </div>
  );
}
