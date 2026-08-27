'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api-client';
import { Trash2 } from 'lucide-react';

export default function DeleteButton({ documentId }: { documentId: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await fetchApi(`/documents/${documentId}`, {
        method: 'DELETE'
      });
      router.push('/documents');
      router.refresh(); // Refresh the list
    } catch (err) {
      console.error(err);
      alert('Failed to delete document.');
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors border
        ${deleting 
          ? 'bg-control text-text-muted border-control opacity-50 cursor-not-allowed' 
          : 'bg-surface text-[var(--color-badge-failed-text)] border-border hover:bg-[var(--color-badge-failed-bg)] hover:border-[var(--color-badge-failed-text)]'
        }`}
    >
      <Trash2 className="w-4 h-4" />
      {deleting ? 'Deleting...' : 'Delete'}
    </button>
  );
}
