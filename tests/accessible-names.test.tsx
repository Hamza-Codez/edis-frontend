/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AskPage from '../app/ask/page';
import QueriesPage from '../app/queries/page';
import * as apiClient from '../lib/api-client';
import type { AskResponse, QueryResponse } from '../lib/types';

jest.mock('../lib/api-client');
const mockedFetchApi = apiClient.fetchApi as jest.MockedFunction<typeof apiClient.fetchApi>;

/**
 * spec07 §5.2 — every interactive element carries an accessible name that says
 * what it acts on.
 *
 * A control named only by an icon, or by a bare number, is unusable with a
 * screen reader and ambiguous with a keyboard. This is the one guard in §5 that
 * cannot be a static grep, because the name is computed from the rendered DOM.
 */
function unnamedControls(): string[] {
  return [...screen.queryAllByRole('button'), ...screen.queryAllByRole('link')]
    .filter((el) => {
      const name =
        el.getAttribute('aria-label') ?? el.getAttribute('title') ?? el.textContent ?? '';
      return name.trim().length === 0;
    })
    .map((el) => el.outerHTML.slice(0, 90));
}

describe('spec07 §5.2 accessible names', () => {
  beforeEach(() => mockedFetchApi.mockClear());

  it('names every control on the answer screen, chips included', async () => {
    mockedFetchApi.mockResolvedValueOnce({
      outcome: 'answered',
      query_id: 1,
      message: null,
      answer: {
        claims: [
          {
            text: 'Records are retained for seven years.',
            citations: [
              {
                chunk_id: 11,
                document_id: 'doc-1',
                filename: 'policy.pdf',
                page_start: 4,
                page_end: 4,
                snippet: 'Seven years.',
                similarity: 0.71,
              },
            ],
          },
        ],
      },
    } satisfies AskResponse);

    render(<AskPage />);
    fireEvent.change(screen.getByPlaceholderText(/retention periods/i), {
      target: { value: 'how long?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    await waitFor(() => expect(screen.getByTestId('answer')).toBeInTheDocument());

    // A citation chip renders as a bare digit. Without aria-label it announces
    // as "1", which names nothing.
    expect(screen.getByRole('button', { name: 'Show source 1' })).toBeInTheDocument();
    expect(unnamedControls()).toEqual([]);
  });

  it('names every control on the query log', async () => {
    mockedFetchApi.mockResolvedValue([
      {
        id: 1,
        user_id: 'u1',
        question: 'a question',
        outcome: 'answered',
        top_similarity: 0.6,
        llm_model: 'm',
        prompt_tokens: 1,
        completion_tokens: 1,
        latency_ms: 1,
        created_at: '2026-08-28T10:00:00Z',
      },
    ] satisfies QueryResponse[]);

    render(<QueriesPage />);

    await waitFor(() => expect(screen.getByTestId('tile-answered')).toBeInTheDocument());
    expect(unnamedControls()).toEqual([]);
  });
});
