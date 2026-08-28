/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import QueriesPage from '../app/queries/page';
import * as apiClient from '../lib/api-client';
import type { QueryResponse } from '../lib/types';

jest.mock('../lib/api-client');

const mockedFetchApi = apiClient.fetchApi as jest.MockedFunction<typeof apiClient.fetchApi>;

function row(outcome: string, id: number): QueryResponse {
  return {
    id,
    user_id: 'u1',
    question: `question ${id}`,
    outcome,
    top_similarity: 0.61,
    llm_model: 'openai/gpt-oss-120b',
    prompt_tokens: 400,
    completion_tokens: 200,
    latency_ms: 900,
    created_at: '2026-08-28T10:00:00Z',
  };
}

describe('QueriesPage', () => {
  beforeEach(() => mockedFetchApi.mockClear());

  it('shows every outcome including the ones with a zero count', async () => {
    // A dashboard that hides an outcome at zero cannot show it rising, which is
    // the only thing these numbers are for.
    mockedFetchApi.mockResolvedValueOnce([row('answered', 1)]);

    render(<QueriesPage />);

    // The tiles render before the data arrives, showing a placeholder, so wait
    // for a real count rather than for the tile to exist.
    await within(await screen.findByTestId('tile-answered')).findByText('1');

    for (const key of ['insufficient_context', 'ungrounded_rejected', 'upstream_error']) {
      // Zero counts are rendered, not hidden.
      expect(within(screen.getByTestId(`tile-${key}`)).getByText('0')).toBeInTheDocument();
    }
  });

  it('does not present a refusal as a failure', async () => {
    // insufficient_context is the system working as designed. Styled as an
    // error it would read as a fault and invite someone to "fix" the gate.
    mockedFetchApi.mockResolvedValueOnce([
      row('insufficient_context', 1),
      row('insufficient_context', 2),
    ]);

    render(<QueriesPage />);

    const tile = await screen.findByTestId('tile-insufficient_context');
    const count = await within(tile).findByText('2');
    expect(count.className).not.toContain('text-danger');
  });

  it('marks an ungrounded rejection as alarming when it happens', async () => {
    mockedFetchApi.mockResolvedValueOnce([row('ungrounded_rejected', 1)]);

    render(<QueriesPage />);

    const tile = await screen.findByTestId('tile-ungrounded_rejected');
    const count = await within(tile).findByText('1');
    expect(count.className).toContain('text-danger');
  });

  it('says the window the mix was computed over', async () => {
    // A rate computed from a capped window and presented as "the" rate is a lie.
    mockedFetchApi.mockResolvedValueOnce([row('answered', 1), row('answered', 2)]);

    render(<QueriesPage />);

    await waitFor(() => expect(screen.getByText(/2 most recent queries/)).toBeInTheDocument());
  });

  it('distinguishes an empty log from an empty filter', async () => {
    mockedFetchApi.mockResolvedValueOnce([]);

    render(<QueriesPage />);

    await waitFor(() => expect(screen.getByText('No questions asked yet.')).toBeInTheDocument());
  });
});
