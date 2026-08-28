'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchApi, ApiError } from '@/lib/api-client';
import { UploadCloud, File as FileIcon, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { DocumentResponse, DocumentStatus } from '@/lib/types';

// Re-exported from the generated contract, never redefined: a hand-written copy
// silently disagrees with the backend instead of failing the type check.
type DocumentRow = DocumentResponse;

const MAX_UPLOAD_MB = 25;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export default function DocumentList() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const fetchDocuments = async () => {
    try {
      const data = await fetchApi<{ items: DocumentRow[] }>('/documents');
      setDocuments(data.items);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocuments();
  }, []);

  // Polling logic: poll every 3s if any document is non-terminal
  useEffect(() => {
    const hasNonTerminal = documents.some(d => !['indexed', 'failed'].includes(d.status));
    
    if (hasNonTerminal) {
      const timer = setTimeout(() => {
        fetchDocuments();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [documents]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadError(null);
    
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(`This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB; the limit is ${MAX_UPLOAD_MB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const idempotencyKey = crypto.randomUUID();

    setUploading(true);
    try {
      await fetchApi('/documents', {
        method: 'POST',
        body: formData,
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      });
      // Fetch immediately to show the 'pending' row
      await fetchDocuments();
    } catch (err) {
      if (err instanceof ApiError) {
        setUploadError(err.message);
      } else {
        setUploadError('An unexpected error occurred during upload.');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getBadgeClass = (status: DocumentStatus) => {
    const base = "px-2 py-1 rounded-sm text-xs font-medium border border-border inline-flex items-center capitalize transition-all";
    switch (status) {
      case 'pending': return `${base} bg-[var(--color-badge-pending-bg)] text-[var(--color-badge-pending-text)]`;
      case 'extracting': return `${base} bg-[var(--color-badge-extracting-bg)] text-[var(--color-badge-extracting-text)]`;
      case 'chunking': return `${base} bg-[var(--color-badge-chunking-bg)] text-[var(--color-badge-chunking-text)]`;
      case 'embedding': return `${base} bg-[var(--color-badge-embedding-bg)] text-[var(--color-badge-embedding-text)]`;
      case 'indexed': return `${base} bg-[var(--color-badge-indexed-bg)] text-[var(--color-badge-indexed-text)]`;
      case 'failed': return `${base} bg-[var(--color-badge-failed-bg)] text-[var(--color-badge-failed-text)]`;
      default: return base;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-md p-6">
        <h2 className="text-lg font-semibold text-text mb-4">Upload Document</h2>
        <div className="flex flex-col items-start gap-4">
          <label className={`
            flex items-center gap-3 px-4 py-3 rounded-md border-2 border-dashed 
            transition-colors cursor-pointer w-full max-w-md
            ${uploading ? 'bg-control opacity-50 cursor-not-allowed' : 'hover:bg-canvas border-border hover:border-accent'}
          `}>
            <UploadCloud className="w-5 h-5 text-text-muted" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-text">Choose file or drag and drop</span>
              <span className="text-xs text-text-muted">PDF or DOCX, up to {MAX_UPLOAD_MB} MB</span>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden" 
            />
          </label>
          
          {uploadError && (
            <div className="flex items-start gap-2 text-[var(--color-badge-failed-text)] bg-[var(--color-badge-failed-bg)] p-3 rounded-md max-w-md">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-sm">{uploadError}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-canvas">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Document</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Uploaded</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-text-muted">Loading...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-text-muted flex flex-col items-center gap-2">
                  <FileIcon className="w-8 h-8 text-border" />
                  No documents found. Upload one to get started.
                </td>
              </tr>
            ) : (
              documents.map(doc => (
                <tr key={doc.id} className="hover:bg-canvas transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/documents/${doc.id}`} className="text-sm font-medium text-accent hover:text-accent-hover hover:underline">
                      {doc.filename}
                    </Link>
                    <div className="text-xs text-text-muted mt-1">
                      {(doc.byte_size / 1024).toFixed(1)} KB
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={getBadgeClass(doc.status)}>
                        {doc.status}
                      </span>
                      {doc.status === 'failed' && doc.status_detail && (
                        <p className="text-xs text-[var(--color-badge-failed-text)] max-w-xs break-words">
                          {doc.status_detail}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted whitespace-nowrap">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
