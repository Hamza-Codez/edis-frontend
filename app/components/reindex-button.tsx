'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';

/**
 * Re-chunks and re-embeds from stored page text — no re-upload.
 *
 * This is the escape hatch for a changed chunk size, a changed embedding model,
 * or a document that chunked badly. Without it the only remedy is asking
 * someone to find the original file again, which is why document_pages keeps
 * the extracted text after the binary is discarded.
 */
export default function ReindexButton({ documentId }: { documentId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const reindex = async () => {
    // Confirmed because it spends embedding quota and briefly changes what
    // search returns for this document.
    if (!confirm('Re-chunk and re-embed this document? It will be unsearchable until it finishes.'))
      return;

    setBusy(true);
    setError(null);
    try {
      await fetchApi(`/documents/${documentId}/reindex`, { method: 'POST' });
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Reindex could not be started.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={reindex}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-control px-3 py-2 text-sm font-medium text-text hover:bg-control-hover focus:ring-2 focus:ring-accent focus:outline-none disabled:opacity-50"
      >
        <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
        {busy ? 'Starting…' : 'Reindex'}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
