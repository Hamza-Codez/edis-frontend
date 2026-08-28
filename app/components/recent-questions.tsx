'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api-client';
import type { QueryResponse } from '@/lib/types';
import { Panel } from './ui/panel';

export function RecentQuestions({ onSelect }: { onSelect?: (q: string) => void }) {
  const [queries, setQueries] = useState<QueryResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchApi<QueryResponse[]>('/queries?limit=5')
      .then((data) => {
        if (!cancelled) setQueries(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Panel title="Recent questions">
        <div className="animate-pulse space-y-3 p-4">
          <div className="h-4 w-3/4 rounded bg-structure" />
          <div className="h-4 w-1/2 rounded bg-structure" />
          <div className="h-4 w-5/6 rounded bg-structure" />
        </div>
      </Panel>
    );
  }

  if (queries.length === 0) {
    return null;
  }

  return (
    <Panel title="Recent questions" bodyClassName="">
      <div className="divide-y divide-border">
        {queries.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onSelect?.(q.question)}
            className="w-full px-4 py-3 text-left transition-colors hover:bg-structure/50 focus:bg-structure/50 focus:outline-none"
          >
            <p className="line-clamp-2 text-sm text-text">{q.question}</p>
            <p className="mt-1 text-xs text-text-muted">
              {new Date(q.created_at).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>
    </Panel>
  );
}
