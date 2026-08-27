/**
 * @jest-environment jsdom
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { fetchApi } from '../lib/api-client';

describe('api-client', () => {
  beforeEach(() => {
    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
    
    // Mock global.fetch
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        headers: new Headers({'content-type': 'application/json'}),
        json: () => Promise.resolve({ data: 'ok' })
      } as unknown as Response)
    ) as unknown as typeof fetch;
  });

  it('attaches X-CSRF-Token on mutations', async () => {
    document.cookie = 'csrf_token=test-token-123';
    
    await fetchApi('/test', { method: 'POST' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST'
      })
    );
    
    // Check headers on the actual call
    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const headers = (callArgs[1] as RequestInit).headers as Headers;
    expect(headers.get('X-CSRF-Token')).toBe('test-token-123');
  });

  it('omits X-CSRF-Token on GET requests', async () => {
    document.cookie = 'csrf_token=test-token-123';
    
    await fetchApi('/test', { method: 'GET' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'GET'
      })
    );
    
    // Check headers on the actual call
    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const headers = (callArgs[1] as RequestInit).headers as Headers;
    expect(headers.get('X-CSRF-Token')).toBeNull();
  });
});
