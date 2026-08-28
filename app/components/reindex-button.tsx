'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { ConfirmModal } from './confirm-modal';

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
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const confirmReindex = async () => {
    setShowModal(false);

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
        onClick={() => setShowModal(true)}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-control px-3 py-2 text-sm font-medium text-text hover:bg-control-hover focus:ring-2 focus:ring-accent focus:outline-none disabled:opacity-50"
      >
        <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
        {busy ? 'Starting…' : 'Reindex'}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}

      <ConfirmModal
        isOpen={showModal}
        title="Reindex Document"
        message="Re-chunk and re-embed this document? It will be unsearchable until it finishes."
        confirmLabel="Reindex"
        onConfirm={confirmReindex}
        onCancel={() => setShowModal(false)}
        isDestructive={false}
      />
    </div>
  );
}
