export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); this.name = 'ApiError'; }
}
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...options, headers, credentials: 'include' });
  const text = await response.text();
  let data: any;
  try { data = text ? JSON.parse(text) : undefined; } catch { data = undefined; }
  if (!response.ok) throw new ApiError(data?.error || `Request failed (${response.status})`, response.status, data?.code);
  if (text && data === undefined) throw new ApiError('The server returned an unexpected response.', response.status);
  return data as T;
}
export const apiError = (error: unknown) => error instanceof Error ? error.message : 'An unexpected error occurred.';
export const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });
export async function downloadProject(id: string, name: string) {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}/export`, { credentials: 'include' });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new ApiError(body.error || 'Export failed', response.status); }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a'); link.href = url; link.download = `${name.replace(/[^a-z0-9_-]/gi, '-')}.zip`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
