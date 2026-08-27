/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import AskPage from '../app/ask/page';
import * as apiClient from '../lib/api-client';
import type { AskResponse, CitationChunk } from '../lib/types';

jest.mock('../lib/api-client');

const mockedFetchApi = apiClient.fetchApi as jest.MockedFunction<typeof apiClient.fetchApi>;

function citation(overrides: Partial<CitationChunk> = {}): CitationChunk {
  return {
    chunk_id: 11,
    document_id: 'doc-1',
    filename: 'retention-policy.pdf',
    page_start: 4,
    page_end: 4,
    snippet: 'Records must be retained for seven years.',
    similarity: 0.71,
    ...overrides,
  };
}

async function ask(question = 'How long are records kept?') {
  render(<AskPage />);
  fireEvent.change(screen.getByPlaceholderText(/retention periods/i), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));
}

describe('AskPage', () => {
  beforeEach(() => mockedFetchApi.mockClear());

  it('renders each claim separately rather than as one paragraph', async () => {
    const answered: AskResponse = {
      outcome: 'answered',
      query_id: 1,
      message: null,
      answer: {
        claims: [
          { text: 'Records are retained for seven years.', citations: [citation()] },
          {
            text: 'Financial records are retained for ten.',
            citations: [citation({ chunk_id: 12, page_start: 9, page_end: 10 })],
          },
        ],
      },
    };
    mockedFetchApi.mockResolvedValueOnce(answered);

    await ask();

    await waitFor(() => expect(screen.getByTestId('answer')).toBeInTheDocument());

    // Each claim keeps its own citation. Concatenating them into prose would
    // lose which citation belongs to which sentence.
    expect(screen.getByText(/Records are retained for seven years\./)).toBeInTheDocument();
    expect(screen.getByText(/Financial records are retained for ten\./)).toBeInTheDocument();
    expect(screen.queryByTestId('refusal')).not.toBeInTheDocument();
  });

  it('shows the full chunk text in the evidence panel, untruncated', async () => {
    const long = 'A'.repeat(400);
    mockedFetchApi.mockResolvedValueOnce({
      outcome: 'answered',
      query_id: 2,
      message: null,
      answer: { claims: [{ text: 'Claim.', citations: [citation({ snippet: long })] }] },
    } satisfies AskResponse);

    await ask();

    await waitFor(() => expect(screen.getByTestId('evidence-11')).toBeInTheDocument());
    expect(within(screen.getByTestId('evidence-11')).getByText(long)).toBeInTheDocument();
  });

  it('activates the matching evidence entry when a citation chip is used', async () => {
    mockedFetchApi.mockResolvedValueOnce({
      outcome: 'answered',
      query_id: 3,
      message: null,
      answer: {
        claims: [
          { text: 'First.', citations: [citation()] },
          { text: 'Second.', citations: [citation({ chunk_id: 12 })] },
        ],
      },
    } satisfies AskResponse);

    await ask();

    await waitFor(() => expect(screen.getByTestId('evidence-12')).toBeInTheDocument());
    expect(screen.getByTestId('evidence-12').className).not.toContain('border-accent');

    fireEvent.click(screen.getByRole('button', { name: 'Show source 2' }));

    expect(screen.getByTestId('evidence-12').className).toContain('border-accent');
  });

  it('renders a refusal in its own container, never as an answer', async () => {
    const message = 'I could not find anything in the indexed documents…';
    mockedFetchApi.mockResolvedValueOnce({
      outcome: 'insufficient_context',
      query_id: 4,
      message,
      answer: null,
    } satisfies AskResponse);

    await ask('What is the capital of France?');

    await waitFor(() => expect(screen.getByTestId('refusal')).toBeInTheDocument());
    // A refusal styled like an answer is read as an answer.
    expect(screen.queryByTestId('answer')).not.toBeInTheDocument();
    // The backend message names the remedy; it is shown verbatim.
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('says so plainly when a cited document has since been removed', async () => {
    mockedFetchApi.mockResolvedValueOnce({
      outcome: 'answered',
      query_id: 5,
      message: null,
      answer: { claims: [{ text: 'Claim.', citations: [citation({ filename: '' })] }] },
    } satisfies AskResponse);

    await ask();

    await waitFor(() => expect(screen.getByTestId('evidence-11')).toBeInTheDocument());
    expect(screen.getByText('The source document has been removed.')).toBeInTheDocument();
  });

  it('disables submit while a question is in flight', async () => {
    let release: (value: AskResponse) => void = () => {};
    mockedFetchApi.mockReturnValueOnce(
      new Promise<AskResponse>((resolve) => {
        release = resolve;
      })
    );

    await ask();

    const button = screen.getByRole('button', { name: /working/i });
    expect(button).toBeDisabled();

    release({ outcome: 'insufficient_context', query_id: 6, message: 'none', answer: null });
    await waitFor(() => expect(screen.getByTestId('refusal')).toBeInTheDocument());
  });
});
