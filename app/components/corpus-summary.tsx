'use client';

import Link from 'next/link';
import { useDocuments } from '@/app/hooks/use-documents';
import { StatGrid, StatStack, Stat } from './ui/stat';

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

  // StatGrid tone="ink", not a hand-rolled gradient. The previous markup reached
  // for default-palette utilities, which `--color-*: initial` wipes — so the
  // gradient, the dividers and the figure colour all compiled to nothing and the
  // card rendered unstyled with invisible numbers. The tone gives the same
  // near-black card from real tokens.
  return (
    <StatGrid columns={3} tone="ink">
      <Stat label="Searchable" value={counts.indexed} hint="ready to answer from" />
      <Stat label="Processing" value={counts.processing} hint="not yet searchable" />
      <Stat
        label="Failed"
        value={counts.failed}
        hint={counts.failed > 0 ? 'see Documents for why' : 'none'}
        alarming={counts.failed > 0}
      />
    </StatGrid>
  );
}
