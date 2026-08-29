/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchPage from '../app/search/page';
import * as apiClient from '../lib/api-client';

jest.mock('../lib/api-client');

const mockedFetchApi = apiClient.fetchApi as jest.MockedFunction<typeof apiClient.fetchApi>;

/**
 * Route by path rather than queueing responses.
 *
 * The page reads /search/history on mount and again after each search, so a
 * mockResolvedValueOnce queue is consumed by a request the test never meant to
 * answer — which is how the previous version of this file came to assert on the
 * wrong payload entirely.
 */
function mockApi(searchResponse: unknown, history: unknown[] = []) {
  mockedFetchApi.mockImplementation((path: string) =>
    Promise.resolve(path.startsWith('/search/history') ? history : searchResponse) as never
  );
}

/** POSTs to /search — the paid requests. History reads are not the subject. */
const searchCalls = () =>
  mockedFetchApi.mock.calls.filter(([path]) => path === '/search');

const chunk = (over: Partial<Record<string, unknown>> = {}) => ({
  ordinal: 0,
  document_id: 'doc-1',
  filename: 'first.pdf',
  page_start: 1,
  page_end: 1,
  text: 'This is the best match.',
  similarity: 0.8123456789,
  score: 0.033,
  vector_rank: 1,
  keyword_rank: null,
  ...over,
});

const submit = (question: string) => {
  fireEvent.change(screen.getByPlaceholderText('Ask a question...'), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole('button', { name: /search/i }));
};

describe('SearchPage', () => {
  beforeEach(() => {
    mockedFetchApi.mockReset();
    mockApi({ chunks: [], min_similarity: 0.55 });
  });

  it('renders an idle state that is not a zero-match state', () => {
    render(<SearchPage />);
    expect(screen.getByText('Retrieval Inspector')).toBeInTheDocument();
    expect(screen.queryByText('No chunks matched.')).not.toBeInTheDocument();
  });

  it('distinguishes zero-match from idle', async () => {
    mockApi({ chunks: [], min_similarity: 0.55 });
    render(<SearchPage />);
    submit('gibberish');

    await waitFor(() => {
      expect(screen.getByText('No chunks matched.')).toBeInTheDocument();
    });
  });

  it('marks weak chunks instead of hiding them, using the API threshold', async () => {
    // spec08 §2.3 and spec04 §2: weak results are shown, never hidden. This
    // screen is the only place to see why /ask refused, so a filtered-out chunk
    // is the one thing the user most needed to see.
    mockApi({
      min_similarity: 0.55,
      chunks: [
        chunk(),
        chunk({
          ordinal: 1,
          document_id: 'doc-2',
          filename: 'second.docx',
          text: 'This is a weaker match.',
          similarity: 0.123,
          score: 0.015,
          vector_rank: null,
          keyword_rank: 15,
        }),
      ],
    });

    render(<SearchPage />);
    submit('test question');

    await waitFor(() => {
      expect(screen.getByText('Score: 0.0330')).toBeInTheDocument();
    });

    // Present, not filtered — and carrying the marker.
    expect(screen.getByText('This is a weaker match.')).toBeInTheDocument();
    expect(screen.getAllByText('below the gate')).toHaveLength(1);

    // The strong chunk is above 0.55 and must not be marked.
    expect(screen.getByText('cos: 0.8123')).toBeInTheDocument();

    // Leg tags come from the null ranks, not from a second request.
    expect(screen.getByText('vector only')).toBeInTheDocument();
    expect(screen.getByText('keyword only')).toBeInTheDocument();
  });

  it('honours the threshold the API sends, not a hardcoded one', async () => {
    // 0.30 would be above a 0.5 default and below the 0.95 the server actually
    // reports. Only a page reading min_similarity marks it.
    mockApi({ min_similarity: 0.95, chunks: [chunk({ similarity: 0.3 })] });
    render(<SearchPage />);
    submit('test question');

    await waitFor(() => {
      expect(screen.getByText('below the gate')).toBeInTheDocument();
    });
  });

  it('keyword mode renders ts_rank order and cos —, and never marks a row', async () => {
    // The backend reports similarity as 0.0 in keyword mode because it computes
    // no query vector. Marking on that would mark every row, every time.
    mockApi({
      min_similarity: 0.55,
      chunks: [
        chunk({
          text: 'Keyword match',
          similarity: 0.0,
          score: null,
          vector_rank: null,
          keyword_rank: 1,
        }),
      ],
    });

    render(<SearchPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'Keyword' }));
    submit('test');

    await waitFor(() => {
      expect(screen.getByText('Keyword match')).toBeInTheDocument();
    });

    expect(screen.getByText('ts_rank order')).toBeInTheDocument();
    expect(screen.getByText('cos —')).toBeInTheDocument();
    expect(screen.queryByText('below the gate')).not.toBeInTheDocument();
  });

  it('issues exactly one search request per submit, and repeats are allowed', async () => {
    render(<SearchPage />);

    submit('test');
    await waitFor(() => expect(searchCalls()).toHaveLength(1));

    fireEvent.click(screen.getByRole('radio', { name: 'Vector' }));
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(searchCalls()).toHaveLength(2));

    // The same question, mode and limit again. Every search writes a history
    // row, so a guard against repeats disabled the second run of any query —
    // and every click on a recent question, which by definition matches one.
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(searchCalls()).toHaveLength(3));
  });

  it('survives a history response that is not a list', async () => {
    // A non-array reaching the grouping useMemo threw and white-screened the
    // page, losing the results the user came for over a side panel.
    mockedFetchApi.mockImplementation((path: string) =>
      Promise.resolve(
        path.startsWith('/search/history')
          ? ({ error: { code: 'BOOM' } } as unknown)
          : { chunks: [chunk()], min_similarity: 0.55 }
      ) as never
    );

    render(<SearchPage />);
    submit('test');

    await waitFor(() => {
      expect(screen.getByText('This is the best match.')).toBeInTheDocument();
    });
  });
});
