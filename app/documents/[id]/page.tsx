import 'server-only';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import DeleteButton from '@/app/components/delete-button';
import ReindexButton from '@/app/components/reindex-button';
import { canModifyDocument } from '@/lib/labels';
import { File as FileIcon, Clock, HardDrive, FileText } from 'lucide-react';

export const metadata = {
  title: 'Document Details - EDIS',
};

async function getDocument(id: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  
  if (!sessionCookie) return null;
  
  try {
    const res = await fetch(`${process.env.API_ORIGIN}/documents/${id}`, {
      headers: {
        Cookie: `session=${sessionCookie.value}`
      },
      cache: 'no-store'
    });
    
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch');
    return await res.json();
  } catch {
    return null;
  }
}

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
  // Await the params since Next 15+ sometimes requires this, but we'll stick to safe standard
  const { id } = await params;
  
  const doc = await getDocument(id);
  if (!doc) {
    notFound();
  }

  const user = await getCurrentUser();
  // Same rule the backend enforces, expressed once in lib/labels.
  const canDelete = user ? canModifyDocument(user, doc.uploaded_by) : false;
  
  const isDocx = doc.content_type.includes('wordprocessingml');
  const unitName = isDocx ? 'Section' : 'Page';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-space-grotesk font-bold text-heading flex items-center gap-3">
            <FileIcon className="w-8 h-8 text-accent" />
            {doc.filename}
          </h1>
          <div className="flex gap-6 mt-4 text-sm text-text-muted">
            <span className="flex items-center gap-1"><HardDrive className="w-4 h-4" /> {(doc.byte_size / 1024).toFixed(1)} KB</span>
            <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {doc.page_count || 0} {unitName}s</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(doc.created_at).toLocaleString()}</span>
          </div>
        </div>
        
        {canDelete && (
          <div className="flex items-start gap-3">
            <ReindexButton documentId={doc.id} />
            <DeleteButton documentId={doc.id} />
          </div>
        )}
      </div>
      
      {doc.pages && doc.pages.length > 0 ? (
        <div className="space-y-6 mt-8">
          <h2 className="text-xl font-semibold text-text border-b border-border pb-2">Extracted Content</h2>
          {doc.pages.map((page: { id: number; page_number: number; text: string }) => (
            <div key={page.id} className="bg-surface border border-border rounded-md p-6">
              <h3 className="text-sm font-medium text-text-muted mb-4 pb-2 border-b border-border uppercase tracking-wide">
                {unitName} {page.page_number}
              </h3>
              <p className="whitespace-pre-wrap text-text leading-relaxed text-sm font-sans">
                {page.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-md p-8 text-center mt-8">
          <p className="text-text-muted">No content extracted yet. Document status: <span className="font-semibold">{doc.status}</span></p>
        </div>
      )}
    </div>
  );
}
