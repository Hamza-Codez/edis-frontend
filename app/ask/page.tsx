'use client';

import { useMemo, useRef, useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronRight, MessageCircleQuestion, Search } from 'lucide-react';
import { fetchApi } from '../../lib/api-client';
import type { AskResponse, CitationChunk } from '../../lib/types';
import { Panel } from '../components/ui/panel';
import { CorpusSummary } from '../components/corpus-summary';
import { RecentQuestions } from '../components/recent-questions';

function buildEvidence(response: AskResponse): CitationChunk[] {
  const seen = new Map<number, CitationChunk>();
  for (const claim of response.answer?.claims ?? []) {
    for (const citation of claim.citations) {
      if (!seen.has(citation.chunk_id)) seen.set(citation.chunk_id, citation);
    }
  }
  return [...seen.values()];
}

function pageLabel(citation: CitationChunk): string {
  return citation.page_start === citation.page_end
    ? `p. ${citation.page_start}`
    : `pp. ${citation.page_start}–${citation.page_end}`;
}

function flatten(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function AskFormContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q');
  
  const [question, setQuestion] = useState(q || '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [activeChunkId, setActiveChunkId] = useState<number | null>(null);
  const entryRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  // Prefill without firing request is handled by initial useState(q || '')
  useEffect(() => {
    if (q && !question) setQuestion(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const evidence = useMemo(() => (result ? buildEvidence(result) : []), [result]);
  const chipNumber = useMemo(() => {
    const map = new Map<number, number>();
    evidence.forEach((citation, index) => map.set(citation.chunk_id, index + 1));
    return map;
  }, [evidence]);

  const toggle = (chunkId: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) next.delete(chunkId);
      else next.add(chunkId);
      return next;
    });

  const reveal = (chunkId: number) => {
    setActiveChunkId(chunkId);
    setExpanded((prev) => new Set(prev).add(chunkId));
    entryRefs.current.get(chunkId)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setExpanded(new Set());
    setActiveChunkId(null);
    setAsked(question);

    try {
      setResult(
        await fetchApi<AskResponse>('/qa/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        })
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The question could not be answered.');
    } finally {
      setIsLoading(false);
    }
  };

  const isIdle = !result && !isLoading && !error;

  return (
    <div className="mx-auto max-w-7xl pb-16">
      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-4 sticky top-6 space-y-6">
          {isIdle && (
            <>
              <Panel title="Scope">
                <CorpusSummary layout="stack" />
              </Panel>
              <Panel title="Recent">
                <RecentQuestions />
              </Panel>
            </>
          )}

          {result && (
            <Panel title="Receipt">
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">Outcome</div>
                  <div className="text-sm font-medium text-text">
                    {result.outcome === 'answered' ? 'Answered' : 'No supported answer'}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">Log Entry</div>
                  <Link href={`/queries/${result.query_id}`} className="text-sm text-accent hover:underline flex items-center gap-1">
                    Query #{result.query_id} →
                  </Link>
                </div>

                {evidence.length > 0 && (
                  <div>
                    <div className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">Sources ({evidence.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {evidence.map(citation => (
                        <button
                          key={citation.chunk_id}
                          type="button"
                          onClick={() => reveal(citation.chunk_id)}
                          title={`${citation.filename} · ${pageLabel(citation)}`}
                          aria-label={`Jump to source ${chipNumber.get(citation.chunk_id)}`}
                          className="inline-flex h-6 min-w-6 items-center justify-center rounded-sm border border-accent/20 bg-accent/10 px-2 font-mono text-[12px] text-accent hover:bg-accent hover:text-text-on-accent focus:ring-2 focus:ring-accent focus:outline-none transition-colors"
                        >
                          {chipNumber.get(citation.chunk_id)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>

        <div className="col-span-8 space-y-8">
          <header className="space-y-1">
            <h1 className="font-space-grotesk text-2xl font-bold text-heading">Ask</h1>
            <p className="text-sm text-text-muted">
              Answers come only from indexed documents. Every sentence is numbered to the passage it
              came from.
            </p>
          </header>

          <form onSubmit={handleAsk} className="flex gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
              />
              <input
                id="question"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What does the policy say about retention periods?"
                className="h-10 w-full rounded-sm border border-border bg-surface pr-4 pl-9 text-text focus:border-accent focus:ring-2 focus:ring-accent focus:outline-none"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="flex h-10 items-center gap-2 rounded-sm bg-accent px-5 font-medium text-text-on-accent hover:bg-accent-hover focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageCircleQuestion size={17} />
              {isLoading ? 'Working…' : 'Ask'}
            </button>
          </form>

          {isLoading && (
            <div
              role="status"
              className="rounded-md border border-border bg-structure px-4 py-3 text-sm text-text-muted"
            >
              Searching passages, then checking every citation before showing anything.
            </div>
          )}

          {error && (
            <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3 text-danger">
              {error}
            </div>
          )}

          {result?.outcome === 'insufficient_context' && (
            <section
              data-testid="refusal"
              className="space-y-4 rounded-md border-2 border-dashed border-border bg-structure/50 p-6"
            >
              <h2 className="font-space-grotesk font-bold text-text">No supported answer</h2>
              <p className="text-text-muted">{result.message}</p>
              
              <div className="flex gap-4 items-center">
                <Link 
                  href={`/search?q=${encodeURIComponent(asked || '')}`}
                  className="inline-flex h-9 items-center justify-center rounded-sm bg-accent/10 px-4 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
                >
                  Search instead →
                </Link>
              </div>

              {asked && (
                <p className="border-t border-border pt-4 text-sm text-text-muted italic">
                  You asked: “{asked}”
                </p>
              )}
            </section>
          )}

          {result?.outcome === 'answered' && result.answer && (
            <div data-testid="answer" className="space-y-8">
              <section className="space-y-4 rounded-md border border-border bg-surface p-6">
                {result.answer.claims.map((claim, index) => (
                  <p key={index} className="text-[15px] leading-7 text-text">
                    {claim.text}
                    {claim.citations.map((citation) => (
                      <button
                        key={citation.chunk_id}
                        type="button"
                        onClick={() => reveal(citation.chunk_id)}
                        title={`${citation.filename} · ${pageLabel(citation)}`}
                        aria-label={`Show source ${chipNumber.get(citation.chunk_id)}`}
                        className="relative mx-1 inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-accent/20 bg-accent/10 px-1 align-text-top font-mono text-[11px] text-accent before:absolute before:-inset-2.5 before:content-[''] hover:bg-accent hover:text-text-on-accent focus:ring-2 focus:ring-accent focus:outline-none"
                      >
                        {chipNumber.get(citation.chunk_id)}
                      </button>
                    ))}
                  </p>
                ))}
              </section>

              <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-space-grotesk font-bold text-text">Sources</h2>
                  <span className="text-xs text-text-muted">
                    {evidence.length} passage{evidence.length === 1 ? '' : 's'} · click a number above
                    to jump
                  </span>
                </div>

                {evidence.map((citation) => {
                  const isOpen = expanded.has(citation.chunk_id);
                  return (
                    <div
                      key={citation.chunk_id}
                      data-testid={`evidence-${citation.chunk_id}`}
                      ref={(el) => {
                        entryRefs.current.set(citation.chunk_id, el);
                      }}
                      className={`overflow-hidden rounded-md border bg-structure ${
                        activeChunkId === citation.chunk_id ? 'border-accent' : 'border-border'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(citation.chunk_id)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-control focus:ring-2 focus:ring-accent focus:outline-none"
                      >
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-sm bg-accent/10 font-mono text-[11px] text-accent">
                          {chipNumber.get(citation.chunk_id)}
                        </span>
                        {citation.filename ? (
                          <span className="flex-1 truncate text-sm font-medium text-text">
                            {citation.filename}{' '}
                            <span className="font-normal text-text-muted">
                              · {pageLabel(citation)}
                            </span>
                          </span>
                        ) : (
                          <span className="flex-1 text-sm text-text-muted">
                            The source document has been removed
                          </span>
                        )}
                        <span className="font-mono text-xs tabular-nums text-text-muted">
                          {citation.similarity.toFixed(2)}
                        </span>
                        {isOpen ? (
                          <ChevronDown size={16} className="text-text-muted" />
                        ) : (
                          <ChevronRight size={16} className="text-text-muted" />
                        )}
                      </button>

                      <div className="border-t border-border px-4 py-3">
                        {isOpen ? (
                          <>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-text">
                              {citation.snippet}
                            </p>
                            {citation.filename && (
                              <Link
                                href={`/documents/${citation.document_id}`}
                                className="mt-3 inline-block text-xs font-medium text-accent hover:underline"
                              >
                                Open document →
                              </Link>
                            )}
                          </>
                        ) : (
                          <p className="line-clamp-2 text-sm leading-relaxed text-text-muted">
                            {flatten(citation.snippet)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading...</div>}>
      <AskFormContent />
    </Suspense>
  );
}
