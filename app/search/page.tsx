'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { fetchApi } from '../../lib/api-client';

interface Chunk {
  chunk_id: number;
  document_id: string;
  filename: string;
  page_start: number;
  page_end: number;
  snippet: string;
  similarity: number;
  score: number | null;
  vector_rank: number | null;
  keyword_rank: number | null;
}

export default function SearchPage() {
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<'vector' | 'keyword' | 'hybrid'>('hybrid');
  const [threshold, setThreshold] = useState<number>(0.5);
  const [results, setResults] = useState<Chunk[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await fetchApi('/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, mode, limit: 10 }),
      }) as { chunks: Chunk[] };
      
      setResults(data.chunks);
    } catch (err: any) {
      setError(err.message || 'An error occurred during search.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="font-space-grotesk text-2xl font-bold text-text">Retrieval Inspector</h1>
        <p className="text-text-muted">Diagnostic tool for inspecting un-synthesized chunk rankings.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-4 p-4 bg-structure border border-border rounded-lg shadow-sm items-end">
        <div className="flex-1">
          <label htmlFor="question" className="block text-sm font-medium text-text-muted mb-1">Question</label>
          <input
            id="question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="w-full bg-canvas text-text border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="threshold" className="block text-sm font-medium text-text-muted mb-1" title="RAG_MIN_SIMILARITY">Threshold: {threshold}</label>
          <input
            id="threshold"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-32 py-2"
          />
        </div>
        <div>
          <label htmlFor="mode" className="block text-sm font-medium text-text-muted mb-1">Mode</label>
          <select
            id="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="bg-canvas text-text border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={isLoading}
          >
            <option value="hybrid">Hybrid</option>
            <option value="vector">Vector</option>
            <option value="keyword">Keyword</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="bg-accent text-white px-6 py-2 rounded-md font-medium hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-10"
        >
          <Search size={18} />
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-danger/10 text-danger border border-danger/20 rounded-md">
          {error}
        </div>
      )}

      {results && results.length === 0 && (
        <div className="p-12 text-center text-text-muted border border-border border-dashed rounded-lg">
          No chunks matched.
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-4">
          {results.map((chunk, index) => (
            <div key={chunk.chunk_id} className={`bg-structure border rounded-lg shadow-sm overflow-hidden ${chunk.similarity < threshold ? 'border-warning/50' : 'border-border'}`}>
              {chunk.similarity < threshold && (
                <div className="bg-warning/10 text-warning px-4 py-1 text-xs font-medium border-b border-warning/20">
                  Below Answer Threshold
                </div>
              )}
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-wrap gap-4 items-center">
                    <span className="font-mono text-sm bg-accent/10 text-accent px-2 py-1 rounded">
                      {mode === 'hybrid' && chunk.score !== null ? `Score: ${chunk.score}` : `Sim: ${chunk.similarity}`}
                    </span>
                    <span className="text-text-muted text-sm">
                      Rank #{index + 1}
                    </span>
                    {mode === 'hybrid' && (
                      <div className="flex gap-2 text-xs text-text-muted font-mono bg-canvas px-2 py-1 rounded border border-border">
                        <span title="Vector Rank">V: {chunk.vector_rank ?? '—'}</span>
                        <span className="text-border">|</span>
                        <span title="Keyword Rank">K: {chunk.keyword_rank ?? '—'}</span>
                        <span className="text-border">|</span>
                        <span title="Raw Similarity">Raw: {chunk.similarity}</span>
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/documents/${chunk.document_id}`}
                    className="text-sm font-medium text-accent hover:underline flex items-center gap-1 shrink-0"
                  >
                    {chunk.filename} (Page {chunk.page_start === chunk.page_end ? chunk.page_start : `${chunk.page_start}-${chunk.page_end}`})
                  </Link>
                </div>
                
                <div className="bg-canvas p-4 rounded border border-border">
                  <p className="text-text whitespace-pre-wrap font-sora leading-relaxed">{chunk.snippet}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
