import { Suspense } from 'react';
import DocumentList from '@/app/components/document-list';

export const metadata = {
  title: 'Documents - EDIS',
};

export default function DocumentsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-space-grotesk font-bold text-text mb-8">Documents</h1>
      <Suspense fallback={<div className="text-text-muted">Loading documents...</div>}>
        <DocumentList />
      </Suspense>
    </div>
  );
}
