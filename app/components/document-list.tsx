'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchApi, ApiError } from '@/lib/api-client';
import { UploadCloud, File as FileIcon, AlertCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ConfirmModal } from './confirm-modal';
import type { CurrentUser, DocumentResponse, DocumentStatus } from '@/lib/types';
import { canModifyDocument } from '@/lib/labels';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewer, setViewer] = useState<CurrentUser | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [docToRemove, setDocToRemove] = useState<DocumentRow | null>(null);
  
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

  useEffect(() => {
    // Who is looking, so a Remove control is only offered where the backend
    // would actually allow it. This is UX: the backend answers 404 regardless.
    let cancelled = false;
    fetchApi<CurrentUser>('/auth/me')
      .then((me) => !cancelled && setViewer(me))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemove = (doc: DocumentRow) => {
    setDocToRemove(doc);
  };

  const confirmRemove = async () => {
    const doc = docToRemove;
    if (!doc) return;

    setDocToRemove(null);
    setRemovingId(doc.id);
    setRemoveError(null);
    try {
      await fetchApi(`/documents/${doc.id}`, { method: 'DELETE' });
      setDocuments((current) => current.filter((d) => d.id !== doc.id));
    } catch (err) {
      setRemoveError(
        err instanceof ApiError ? err.message : 'That document could not be removed.'
      );
    } finally {
      setRemovingId(null);
    }
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    
    setUploadError(null);
    
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(`This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB; the limit is ${MAX_UPLOAD_MB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleStartScan = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    const idempotencyKey = crypto.randomUUID();

    setUploading(true);
    setUploadError(null);
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
      setSelectedFile(null);
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
          <div className="flex flex-row items-center gap-4 w-full">
            <label className={`
              flex items-center gap-3 px-4 py-3 rounded-md border-2 border-dashed 
              transition-colors cursor-pointer w-full max-w-md
              ${uploading ? 'bg-control opacity-50 cursor-not-allowed' : 'hover:bg-canvas border-border hover:border-accent'}
            `}>
              <UploadCloud className="w-5 h-5 text-text-muted" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-text">
                  {selectedFile ? selectedFile.name : 'Choose file or drag and drop'}
                </span>
                <span className="text-xs text-text-muted">
                  {selectedFile 
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` 
                    : `PDF or DOCX, up to ${MAX_UPLOAD_MB} MB`}
                </span>
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
            <button
              type="button"
              onClick={handleStartScan}
              disabled={!selectedFile || uploading}
              className="px-6 py-3 rounded-md font-medium transition-colors bg-accent text-text-on-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {uploading ? 'Scanning...' : 'Start Scan'}
            </button>
          </div>
          
          {uploadError && (
            <div className="flex items-start gap-2 text-[var(--color-badge-failed-text)] bg-[var(--color-badge-failed-bg)] p-3 rounded-md max-w-md">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-sm">{uploadError}</p>
            </div>
          )}
        </div>
      </div>

      {removeError && (
        <div className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{removeError}</p>
        </div>
      )}

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-chrome">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-chrome-text uppercase tracking-wider">Document</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-chrome-text uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-chrome-text uppercase tracking-wider">Uploaded</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-chrome-text uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-text-muted">Loading...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-text-muted flex flex-col items-center gap-2">
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
                  <td className="px-6 py-4 text-sm text-text-muted whitespace-nowrap tabular-nums">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    {viewer && canModifyDocument(viewer, doc.uploaded_by) && (
                      <button
                        type="button"
                        onClick={() => handleRemove(doc)}
                        disabled={removingId === doc.id}
                        aria-label={`Remove ${doc.filename}`}
                        className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10 focus:ring-2 focus:ring-accent focus:outline-none disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {removingId === doc.id ? 'Removing…' : 'Remove'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={docToRemove !== null}
        title="Remove Document"
        message={`Remove "${docToRemove?.filename}"? Its text, chunks and embeddings are deleted. Questions already asked keep their record.`}
        confirmLabel="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setDocToRemove(null)}
      />
    </div>
  );
}
