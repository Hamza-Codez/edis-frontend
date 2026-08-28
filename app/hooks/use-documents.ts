import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api-client';
import type { DocumentResponse } from '@/lib/types';

let inFlight: Promise<DocumentResponse[]> | null = null;
let cached: DocumentResponse[] | null = null;

/**
 * Module-scoped fetch to prevent multiple components on the same page
 * (e.g. CorpusSummary and "In scope right now") from racing each other
 * to fetch exactly the same data.
 */
export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentResponse[] | null>(cached);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (cached) {
      return;
    }

    if (!inFlight) {
      inFlight = fetchApi<{ items: DocumentResponse[] }>('/documents')
        .then((res) => {
          cached = res.items;
          return cached;
        })
        .finally(() => {
          inFlight = null;
        });
    }

    inFlight
      .then((data) => {
        if (!cancelled) {
          setDocuments(data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { documents, failed };
}
