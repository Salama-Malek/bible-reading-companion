import * as SecureStore from 'expo-secure-store';

import { ApiError, ApiErrorPayload, ApiErrorResponse, ApiResponse } from './types';

const TOKEN_STORAGE_KEY = 'auth_token';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

let cachedToken: string | null = null;

if (!API_BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL is not set.');
}

async function getAuthToken(): Promise<string | null> {
  if (cachedToken !== null) {
    return cachedToken;
  }

  const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  cachedToken = token;
  return token;
}

export async function setAuthToken(token: string): Promise<void> {
  cachedToken = token;
  await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  cachedToken = null;
  await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
}

function normalizeUrl(path: string): string {
  const normalizedBase = API_BASE_URL!.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function parseJsonSafely(response: Response): Promise<unknown | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(init.headers ?? {});

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(normalizeUrl(path), {
    ...init,
    headers,
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const errorPayload =
      payload && typeof payload === 'object' && 'error' in payload
        ? (payload as ApiErrorResponse).error
        : ({
            code: 'HTTP_ERROR',
            message: `Request failed with status ${response.status}.`,
            details: null,
          } as ApiErrorPayload);

    throw new ApiError(errorPayload, response.status);
  }

  if (!payload || typeof payload !== 'object' || !(payload as { ok?: boolean }).ok) {
    throw new ApiError(
      {
        code: 'INVALID_RESPONSE',
        message: 'API returned an unexpected response format.',
        details: null,
      },
      response.status,
    );
  }

  return (payload as ApiResponse<T>).data;
}
