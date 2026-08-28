/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchPage from '../app/search/page';
import * as apiClient from '../lib/api-client';

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
    expect(screen.queryByText('No chunks matched.')).not.toBeInTheDocument();
  });

  it('distinguishes zero-match state from initial state', async () => {
    mockedFetchApi.mockResolvedValueOnce({ chunks: [], min_similarity: 0.5 });

    render(<SearchPage />);
    
    fireEvent.change(screen.getByPlaceholderText('Ask a question...'), { target: { value: 'gibberish' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText('No chunks matched.')).toBeInTheDocument();
    });
  });

  it('filters chunks below min_similarity and renders mode-aware tags', async () => {
    // 0.8123 (>=0.5) is kept, 0.123 (<0.5) is hidden completely
    mockedFetchApi.mockResolvedValueOnce({
      min_similarity: 0.5,
      chunks: [
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
          keyword_rank: null,
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
      ]
    });

    render(<SearchPage />);
    
    fireEvent.change(screen.getByPlaceholderText('Ask a question...'), { target: { value: 'test question' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText('Score: 0.0330')).toBeInTheDocument();
    });

    // The weak match is filtered out entirely
    expect(screen.queryByText('This is a weaker match.')).not.toBeInTheDocument();

    // The good match has a "vector only" tag since keyword_rank is null
    expect(screen.getByText('vector only')).toBeInTheDocument();
    
    // Renders full precision for the kept chunk
    expect(screen.getByText('cos: 0.8123')).toBeInTheDocument();
    
    // There are no markers for "Below Answer Threshold"
    expect(screen.queryByText(/Below Answer Threshold/i)).not.toBeInTheDocument();
  });

  it('keyword mode renders ts_rank order and cos —', async () => {
    mockedFetchApi.mockResolvedValueOnce({
      min_similarity: 0.0,
      chunks: [
        {
          ordinal: 0,
          document_id: 'doc-1',
          filename: 'first.pdf',
          page_start: 1,
          page_end: 1,
          text: 'Keyword match',
          similarity: 0.0,
          score: null,
          vector_rank: null,
          keyword_rank: 1,
        }
      ]
    });

    render(<SearchPage />);
    
    fireEvent.change(screen.getByPlaceholderText('Ask a question...'), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Keyword' }));
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText('Keyword match')).toBeInTheDocument();
    });

    expect(screen.getByText('ts_rank order')).toBeInTheDocument();
    expect(screen.getByText('cos —')).toBeInTheDocument();
  });

  it('a mode switch issues exactly two requests when searching twice', async () => {
    mockedFetchApi.mockResolvedValue({ min_similarity: 0.5, chunks: [] });
    render(<SearchPage />);
    
    fireEvent.change(screen.getByPlaceholderText('Ask a question...'), { target: { value: 'test' } });
    
    // Search 1
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    
    // Wait for the first search to finish (button becomes re-enabled)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled();
    });
    
    // Switch mode
    fireEvent.click(screen.getByRole('radio', { name: 'Vector' }));
    
    // Search 2
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(mockedFetchApi).toHaveBeenCalledTimes(2);
    });
  });
});
