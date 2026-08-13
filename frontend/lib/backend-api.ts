'use server';

import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:5000/api/v1';

/**
 * Server-side fetch helper that calls the Express backend API.
 * Reads JWT from httpOnly cookie and attaches as Bearer token.
 * Used by server actions to proxy requests to the backend.
 */
export async function backendFetch<T = Record<string, unknown>>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; meta?: Record<string, unknown> }> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.headers) {
    const incomingHeaders = options.headers as Record<string, string>;
    for (const [key, value] of Object.entries(incomingHeaders)) {
      headers[key] = value;
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const json = await response.json();

  if (!response.ok) {
    const errorMsg = json?.message || json?.error?.message || `Backend API error: ${response.status}`;
    throw new Error(errorMsg);
  }

  return json as { success: boolean; data?: T; message?: string; meta?: Record<string, unknown> };
}
