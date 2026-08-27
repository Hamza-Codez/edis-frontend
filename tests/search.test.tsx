/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchPage from '../app/search/page';
import * as apiClient from '../lib/api-client';
import type { SearchResponseChunk } from '../lib/types';

// Mock the API client
jest.mock('../lib/api-client');

const mockedFetchApi = apiClient.fetchApi as jest.MockedFunction<typeof apiClient.fetchApi>;

describe('SearchPage', () => {
  beforeEach(() => {
    mockedFetchApi.mockClear();
  });

  it('renders initial empty state (no chunks matched not shown)', () => {
    render(<SearchPage />);
    expect(screen.getByText('Retrieval Inspector')).toBeInTheDocument();
    // Neither zero-match state nor results should be present
    expect(screen.queryByText('No chunks matched.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Score:/)).not.toBeInTheDocument();
  });

  it('distinguishes zero-match state from initial state', async () => {
    mockedFetchApi.mockResolvedValueOnce({ chunks: [] });

    render(<SearchPage />);
    
    // Type in a question and submit
    fireEvent.change(screen.getByPlaceholderText('Ask a question...'), { target: { value: 'gibberish' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText('No chunks matched.')).toBeInTheDocument();
    });
  });

  it('renders results in the order received and shows full precision scores', async () => {
    const mockChunks: SearchResponseChunk[] = [
      {
        ordinal: 0,
        document_id: 'doc-1',
        filename: 'first.pdf',
        page_start: 1,
        page_end: 1,
        text: 'This is the best match.',
        similarity: 0.8123456789,
        score: 0.033,
        vector_rank: 1,
        keyword_rank: 2,
      },
      {
        ordinal: 1,
        document_id: 'doc-2',
        filename: 'second.docx',
        page_start: 3,
        page_end: 4,
        text: 'This is a weaker match.',
        similarity: 0.1230000001,
        score: 0.015,
        vector_rank: null,
        keyword_rank: 15,
      }
    ];

    mockedFetchApi.mockResolvedValueOnce({ chunks: mockChunks });

    render(<SearchPage />);
    
    fireEvent.change(screen.getByPlaceholderText('Ask a question...'), { target: { value: 'test question' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    // Wait for results to render
    await waitFor(() => {
      expect(screen.getByText('Score: 0.033')).toBeInTheDocument();
    });

    // Check ranks and raw similarities are displayed
    expect(screen.getByText('Score: 0.015')).toBeInTheDocument();
    expect(screen.getByText('Raw: 0.8123456789')).toBeInTheDocument();
    expect(screen.getByText('Raw: 0.1230000001')).toBeInTheDocument();

    // Check vector and keyword ranks (with fallback to "—")
    expect(screen.getByText('V: 1')).toBeInTheDocument();
    expect(screen.getByText('K: 2')).toBeInTheDocument();
    expect(screen.getByText('V: —')).toBeInTheDocument();
    expect(screen.getByText('K: 15')).toBeInTheDocument();

    // Check Below Answer Threshold marker (only 0.123 < 0.5 threshold)
    const thresholdMarkers = screen.getAllByText('Below Answer Threshold');
    expect(thresholdMarkers).toHaveLength(1);

    // Check order
    const ranks = screen.getAllByText(/Rank #/);
    expect(ranks[0]).toHaveTextContent('Rank #1');
    expect(ranks[1]).toHaveTextContent('Rank #2');

    // Check page ranges
    expect(screen.getByText('first.pdf (Page 1)')).toBeInTheDocument();
    expect(screen.getByText('second.docx (Page 3-4)')).toBeInTheDocument();
    
    // Chunk text renders verbatim and untruncated
    expect(screen.getByText('This is the best match.')).toBeInTheDocument();
    expect(screen.getByText('This is a weaker match.')).toBeInTheDocument();
  });
});
