'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, MessageCircleQuestion, Search } from 'lucide-react';
import { fetchApi } from '../../lib/api-client';
import type { AskResponse, CitationChunk } from '../../lib/types';

/**
 * One entry per distinct cited chunk, numbered in first-citation order.
 *
 * The backend returns full citation objects per claim, not the opaque indices
 * it gave the model — mapping back to real rows is a server concern. So the
 * numbering shown here is derived from the response, and the same number always
 * points at the same evidence entry.
 */
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

/** Extracted PDF text carries hard line breaks mid-sentence. Preserving them in
 *  a preview produces a tall ragged column that reads as noise; the expanded
 *  view keeps them, because that is the passage as stored. */
function flatten(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export default function AskPage() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [activeChunkId, setActiveChunkId] = useState<number | null>(null);
  const entryRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

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
    // Optional call: scrollIntoView is absent in jsdom and in some embedded
    // webviews, and revealing the passage must not depend on scrolling to it.
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

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
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
            className="h-10 w-full rounded-md border border-border bg-surface pr-4 pl-9 text-text focus:border-accent focus:ring-2 focus:ring-accent focus:outline-none"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="flex h-10 items-center gap-2 rounded-md bg-accent px-5 font-medium text-text-on-accent hover:bg-accent-hover focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MessageCircleQuestion size={17} />
          {isLoading ? 'Working…' : 'Ask'}
        </button>
      </form>

      {/*
        The answer is deliberately not streamed: grounding validation runs after
        the model finishes, and a streamed response cannot be withdrawn. This
        states what is happening without inventing per-stage progress the
        backend does not report.
      */}
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
        /*
          Distinct from an answer, and deliberately not an error. The system
          worked and is reporting what it cannot support; styled like an answer
          it would be read as one.
        */
        <section
          data-testid="refusal"
          className="space-y-3 rounded-md border-2 border-dashed border-border bg-structure/50 p-6"
        >
          <h2 className="font-space-grotesk font-bold text-text">No supported answer</h2>
          <p className="text-text-muted">{result.message}</p>
          {asked && (
            <p className="border-t border-border pt-3 text-sm text-text-muted italic">
              You asked: “{asked}”
            </p>
          )}
        </section>
      )}

      {result?.outcome === 'answered' && result.answer && (
        <div data-testid="answer" className="space-y-8">
          <section className="space-y-4 rounded-md border border-border bg-surface p-6">
            {/*
              Rendered claim by claim, never concatenated. The structure is the
              guarantee: flattening loses which citation belongs to which
              sentence, which is the entire point.
            */}
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
                    className="relative mx-1 inline-flex h-5 min-w-5 items-center justify-center rounded border border-accent/20 bg-accent/10 px-1 align-text-top font-mono text-[11px] text-accent before:absolute before:-inset-2.5 before:content-[''] hover:bg-accent hover:text-text-on-accent focus:ring-2 focus:ring-accent focus:outline-none"
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
                    <span className="flex h-5 min-w-5 items-center justify-center rounded bg-accent/10 font-mono text-[11px] text-accent">
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
                      /* The query log keeps chunk ids without a foreign key, so a
                         cited chunk can outlive its document. Factual, not an error. */
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

                  {/* Collapsed shows a flattened preview; expanded shows the passage
                      exactly as stored, line breaks and all. The full text is always
                      one click away — a preview alone could hide the qualifying
                      clause that changes the meaning. */}
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
  );
}
