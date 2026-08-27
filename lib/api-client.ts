export class ApiError extends Error {
  public code: string;
  public details: unknown;

  constructor(message: string, code: string, details: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )csrf_token=([^;]+)'));
  return match ? match[2] : null;
}

/**
 * Callers name the response type from lib/types.ts, which re-exports the
 * generated contract — so a backend rename breaks the build here rather than
 * the page at runtime.
 */
export async function fetchApi<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const isMutation = options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase());
  
  const headers = new Headers(options.headers || {});
  
  if (isMutation) {
    const token = getCsrfToken();
    if (token) {
      headers.set('X-CSRF-Token', token);
    }
  }

  // Next.js API route proxy prefix
  const url = `/api${path}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!response.ok) {
    if (isJson) {
      const data = await response.json();
      if (data.error) {
        throw new ApiError(data.error.message, data.error.code, data.error.details);
      }
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return (isJson ? await response.json() : await response.text()) as T;
}
