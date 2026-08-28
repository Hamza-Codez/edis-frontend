'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { fetchApi } from '../../lib/api-client';
import type { SearchMode, SearchResponse, SearchResponseChunk } from '../../lib/types';
import { Panel } from '../components/ui/panel';
import { SegmentControl } from '../components/ui/segment-control';

const SEARCH_MODES = ['vector', 'keyword', 'hybrid'] as const;

export default function SearchPage() {
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<SearchMode>('hybrid');
  const [limit, setLimit] = useState<string>('10');
  
  const [results, setResults] = useState<SearchResponseChunk[] | null>(null);
  const [prevResults, setPrevResults] = useState<SearchResponseChunk[] | null>(null);
  const [minSimilarity, setMinSimilarity] = useState<number>(0.5);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setPrevResults(results);

    try {
      const data = await fetchApi<SearchResponse>('/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, mode, limit: parseInt(limit, 10) }),
      });
      
      setMinSimilarity(data.min_similarity);
      
      // Spec08: The frontend reads the min_similarity field from the response and filters the chunks array in memory
      const filteredChunks = data.chunks.filter(chunk => chunk.similarity >= data.min_similarity);
      setResults(filteredChunks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during search.');
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankDelta = (chunk: SearchResponseChunk, currentIndex: number) => {
    if (!prevResults) return null;
    const oldIndex = prevResults.findIndex(c => c.document_id === chunk.document_id && c.ordinal === chunk.ordinal);
    if (oldIndex === -1) return 'new';
    const delta = oldIndex - currentIndex;
    if (delta > 0) return `+${delta}`;
    if (delta < 0) return `${delta}`;
    return '—';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="font-space-grotesk text-2xl font-bold text-heading">Retrieval Inspector</h1>
        <p className="text-text-muted">Diagnostic tool for inspecting un-synthesized chunk rankings.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-4 sticky top-6">
          <Panel title="Search Parameters">
            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <div>
                <label htmlFor="question" className="block text-sm font-medium text-text-muted mb-1">Question</label>
                <input
                  id="question"
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full bg-canvas text-text border border-border rounded-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Mode</label>
                <SegmentControl
                  value={mode}
                  onChange={(v) => setMode(v as SearchMode)}
                  options={[
                    { label: 'Hybrid', value: 'hybrid' },
                    { label: 'Vector', value: 'vector' },
                    { label: 'Keyword', value: 'keyword' },
                  ]}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Limit</label>
                <SegmentControl
                  value={limit}
                  onChange={(v) => setLimit(v)}
                  options={[
                    { label: '10', value: '10' },
                    { label: '25', value: '25' },
                    { label: '50', value: '50' },
                  ]}
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="bg-accent text-text-on-accent rounded-sm px-4 py-2 text-sm font-medium transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-10 w-full mt-2"
              >
                <Search size={18} />
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </Panel>
        </div>

        <div className="col-span-8 space-y-4">
          {error && (
            <div className="p-4 bg-danger/10 text-danger border border-danger/20 rounded-md">
              {error}
            </div>
          )}

          {results && results.length === 0 && (
            <div className="p-12 text-center text-text-muted border border-border border-dashed rounded-md">
              No chunks matched.
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-4">
              {results.map((chunk, index) => {
                const delta = getRankDelta(chunk, index);
                
                return (
                  <div key={`${chunk.document_id}-${chunk.ordinal}`} className="bg-structure border border-border rounded-md overflow-hidden">
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-wrap gap-3 items-center">
                          <span className="font-mono text-sm bg-accent/10 text-accent px-2 py-1 rounded-sm">
                            {mode === 'hybrid' && typeof chunk.score === 'number' ? `Score: ${chunk.score.toFixed(4)}` : (mode === 'keyword' ? `ts_rank order` : `cos: ${chunk.similarity.toFixed(4)}`)}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-text font-medium text-sm">
                              Rank #{index + 1}
                            </span>
                            {delta && (
                              <span className={`text-xs font-mono px-1.5 py-0.5 rounded-sm ${delta === 'new' ? 'bg-success/10 text-success' : delta.startsWith('+') ? 'bg-success/10 text-success' : delta.startsWith('-') ? 'bg-danger/10 text-danger' : 'bg-surface text-text-muted border border-border'}`}>
                                {delta}
                              </span>
                            )}
                          </div>

                          {mode === 'hybrid' && (
                            <div className="flex gap-2 text-xs text-text-muted font-mono bg-canvas px-2 py-1 rounded-sm border border-border">
                              <span title="Vector Rank">V: {chunk.vector_rank ?? '—'}</span>
                              <span className="text-border">|</span>
                              <span title="Keyword Rank">K: {chunk.keyword_rank ?? '—'}</span>
                              <span className="text-border">|</span>
                              <span title="Raw Similarity">cos: {chunk.similarity.toFixed(4)}</span>
                            </div>
                          )}
                          
                          {mode === 'hybrid' && chunk.vector_rank === null && (
                            <span className="text-xs font-medium text-warning bg-warning/10 px-2 py-1 rounded-sm">keyword only</span>
                          )}
                          {mode === 'hybrid' && chunk.keyword_rank === null && (
                            <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-sm">vector only</span>
                          )}
                          {mode === 'keyword' && (
                            <span className="text-xs font-mono text-text-muted bg-canvas px-2 py-1 rounded-sm border border-border">cos —</span>
                          )}
                        </div>
                        <Link
                          href={`/documents/${chunk.document_id}`}
                          className="text-sm font-medium text-accent hover:underline flex items-center gap-1 shrink-0"
                        >
                          {chunk.filename} (Page {chunk.page_start === chunk.page_end ? chunk.page_start : `${chunk.page_start}-${chunk.page_end}`})
                        </Link>
                      </div>
                      
                      <div className="bg-canvas p-4 rounded-md border border-border">
                        <p className="text-text whitespace-pre-wrap font-sora leading-relaxed">{chunk.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
