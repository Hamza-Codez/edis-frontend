'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageCircleQuestion } from 'lucide-react';
import { fetchApi } from '../../lib/api-client';
import type { AskResponse, CitationChunk } from '../../lib/types';

/**
 * One entry per distinct cited chunk, numbered in first-citation order.
 *
 * The backend returns full citation objects per claim, not the opaque indices
 * it gave the model — mapping back to real rows is a server concern. So the
 * chip numbering shown here is built from the response, and the same number
 * always points at the same evidence entry.
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
    ? `Page ${citation.page_start}`
    : `Pages ${citation.page_start}–${citation.page_end}`;
}

export default function AskPage() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeChunkId, setActiveChunkId] = useState<number | null>(null);

  const evidence = useMemo(() => (result ? buildEvidence(result) : []), [result]);
  const chipNumber = useMemo(() => {
    const map = new Map<number, number>();
    evidence.forEach((citation, index) => map.set(citation.chunk_id, index + 1));
    return map;
  }, [evidence]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setActiveChunkId(null);
    setAsked(question);

    try {
      const data = await fetchApi<AskResponse>('/qa/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The question could not be answered.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="font-space-grotesk text-2xl font-bold text-text">Ask</h1>
        <p className="text-text-muted">
          Answers are assembled only from indexed documents. Every claim carries the chunk it came
          from.
        </p>
      </div>

      <form
        onSubmit={handleAsk}
        className="flex gap-4 p-4 bg-structure border border-border rounded-lg shadow-sm items-end"
      >
        <div className="flex-1">
          <label htmlFor="question" className="block text-sm font-medium text-text-muted mb-1">
            Question
          </label>
          <input
            id="question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What does the policy say about retention periods?"
            className="w-full bg-canvas text-text border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="bg-accent text-text-on-accent px-6 py-2 rounded-md font-medium hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-10"
        >
          <MessageCircleQuestion size={18} />
          {isLoading ? 'Working…' : 'Ask'}
        </button>
      </form>

      {/*
        The answer is deliberately not streamed: grounding validation runs after
        the model finishes, and a streamed response cannot be withdrawn. This is
        the honest substitute — it states what is happening without inventing
        per-stage progress the backend does not report.
      */}
      {isLoading && (
        <div
          role="status"
          className="p-4 bg-structure border border-border rounded-lg text-text-muted text-sm"
        >
          Retrieving passages, then checking every citation before showing anything.
        </div>
      )}

      {error && (
        <div className="p-4 bg-danger/10 text-danger border border-danger/20 rounded-md">
          {error}
        </div>
      )}

      {result?.outcome === 'insufficient_context' && (
        /*
          Deliberately distinct from an answer, and deliberately not an error
          state. The system worked and is telling the truth about what it does
          not know — styled like an answer it would be read as one.
        */
        <div
          data-testid="refusal"
          className="p-6 border-2 border-dashed border-border rounded-lg bg-structure/50 space-y-2"
        >
          <p className="font-space-grotesk font-bold text-text">No supported answer</p>
          <p className="text-text-muted">{result.message}</p>
          {asked && <p className="text-sm text-text-muted italic">You asked: “{asked}”</p>}
        </div>
      )}

      {result?.outcome === 'answered' && result.answer && (
        <div data-testid="answer" className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-3 space-y-4 bg-surface border border-border rounded-lg p-6">
            {/*
              Rendered claim by claim, never concatenated into a paragraph. The
              structure is the guarantee: flattening loses which citation belongs
              to which sentence, which is the entire point.
            */}
            {result.answer.claims.map((claim, index) => (
              <p key={index} className="text-text leading-relaxed">
                {claim.text}{' '}
                {claim.citations.map((citation) => (
                  <button
                    key={citation.chunk_id}
                    type="button"
                    onClick={() => setActiveChunkId(citation.chunk_id)}
                    className="align-super text-xs font-mono px-1.5 py-0.5 mx-0.5 rounded bg-accent/10 text-accent hover:bg-accent hover:text-text-on-accent focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label={`Show source ${chipNumber.get(citation.chunk_id)}`}
                  >
                    {chipNumber.get(citation.chunk_id)}
                  </button>
                ))}
              </p>
            ))}
          </div>

          <aside className="lg:col-span-2 space-y-3">
            <h2 className="font-space-grotesk font-bold text-text">Evidence</h2>
            {evidence.map((citation) => (
              <div
                key={citation.chunk_id}
                data-testid={`evidence-${citation.chunk_id}`}
                className={`rounded-lg border p-4 space-y-2 bg-structure ${
                  activeChunkId === citation.chunk_id ? 'border-accent' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                    {chipNumber.get(citation.chunk_id)}
                  </span>
                  <span className="text-xs text-text-muted font-mono">
                    Sim: {citation.similarity}
                  </span>
                </div>
                {citation.filename ? (
                  <Link
                    href={`/documents/${citation.document_id}`}
                    className="block text-sm font-medium text-accent hover:underline"
                  >
                    {citation.filename} · {pageLabel(citation)}
                  </Link>
                ) : (
                  /* The query log keeps chunk ids without a foreign key, so a
                     cited chunk can outlive its document. Factual, not an error. */
                  <p className="text-sm text-text-muted">The source document has been removed.</p>
                )}
                {/* Full chunk text, never truncated: a snippet short enough to be
                    tidy is short enough to hide the qualifying clause. */}
                <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
                  {citation.snippet}
                </p>
              </div>
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}
