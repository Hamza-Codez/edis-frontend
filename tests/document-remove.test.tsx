/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentList from '../app/components/document-list';
import * as apiClient from '../lib/api-client';
import type { CurrentUser, DocumentResponse } from '../lib/types';

jest.mock('../lib/api-client', () => ({
  fetchApi: jest.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    details: unknown;
    constructor(message: string, code = 'X', details: unknown = {}) {
      super(message);
      this.code = code;
      this.details = details;
    }
  },
}));

const mockedFetchApi = apiClient.fetchApi as jest.MockedFunction<typeof apiClient.fetchApi>;

const OWNER = 'user-1';

function doc(overrides: Partial<DocumentResponse> = {}): DocumentResponse {
  return {
    id: 'doc-1',
    filename: 'policy.pdf',
    content_type: 'application/pdf',
    byte_size: 2048,
    content_sha256: 'a'.repeat(64),
    page_count: 3,
    status: 'indexed',
    status_detail: null,
    uploaded_by: OWNER,
    processing_started_at: null,
    indexed_at: null,
    chunk_count: 3,
    embedding_model: 'gemini-embedding-001',
    created_at: '2026-08-28T10:00:00Z',
    updated_at: '2026-08-28T10:00:00Z',
    ...overrides,
  };
}

function serve(viewer: CurrentUser, documents: DocumentResponse[], onDelete?: () => Promise<never>) {
  mockedFetchApi.mockImplementation((path: string, options?: RequestInit) => {
    if (options?.method === 'DELETE') return onDelete ? onDelete() : Promise.resolve(undefined);
    if (path.startsWith('/auth/me')) return Promise.resolve(viewer);
    return Promise.resolve({ items: documents });
  });
}

const member: CurrentUser = { id: OWNER, email: 'a@b.c', role: 'member' };
const admin: CurrentUser = { id: 'user-2', email: 'root@b.c', role: 'admin' };
const otherMember: CurrentUser = { id: 'user-3', email: 'other@b.c', role: 'member' };

describe('removing a document', () => {
  beforeEach(() => mockedFetchApi.mockReset());

  it('offers Remove to the uploader', async () => {
    serve(member, [doc()]);
    render(<DocumentList />);
    expect(await screen.findByRole('button', { name: 'Remove policy.pdf' })).toBeInTheDocument();
  });

  it('offers Remove to an admin who did not upload it', async () => {
    serve(admin, [doc()]);
    render(<DocumentList />);
    expect(await screen.findByRole('button', { name: 'Remove policy.pdf' })).toBeInTheDocument();
  });

  it('does not offer Remove to another member', async () => {
    // Reading is shared across the workspace; removing is not. Hiding the
    // control is UX — the backend answers 404 either way.
    serve(otherMember, [doc()]);
    render(<DocumentList />);
    await screen.findByText('policy.pdf');
    expect(screen.queryByRole('button', { name: 'Remove policy.pdf' })).not.toBeInTheDocument();
  });

  it('drops the row once the backend confirms', async () => {
    serve(member, [doc()]);
    window.confirm = jest.fn(() => true);

    render(<DocumentList />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove policy.pdf' }));

    await waitFor(() => expect(screen.queryByText('policy.pdf')).not.toBeInTheDocument());
  });

  it('keeps the row and shows the reason when the backend refuses', async () => {
    const refusal = new apiClient.ApiError('Not found', 'DOCUMENT_NOT_FOUND', {});
    serve(member, [doc()], () => Promise.reject(refusal));
    window.confirm = jest.fn(() => true);

    render(<DocumentList />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove policy.pdf' }));

    // Optimistically removing the row would tell the user it worked when it did not.
    await waitFor(() => expect(screen.getByText('Not found')).toBeInTheDocument());
    expect(screen.getByText('policy.pdf')).toBeInTheDocument();
  });

  it('does nothing when the confirmation is declined', async () => {
    serve(member, [doc()]);
    window.confirm = jest.fn(() => false);

    render(<DocumentList />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove policy.pdf' }));

    expect(screen.getByText('policy.pdf')).toBeInTheDocument();
    expect(mockedFetchApi).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
