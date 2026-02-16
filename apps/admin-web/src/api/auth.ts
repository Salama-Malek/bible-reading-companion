import { apiFetch, clearAuthToken, setAuthToken } from './client';
import { AuthSuccessData, User } from './types';

type LoginInput = {
  email: string;
  password: string;
};

export async function login(input: LoginInput): Promise<User> {
  const data = await apiFetch<AuthSuccessData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  setAuthToken(data.token);
  return data.user;
}

export async function me(): Promise<User> {
  const data = await apiFetch<{ user: User }>('/auth/me', {
    method: 'GET',
  });

  return data.user;
}

export function logout(): void {
  clearAuthToken();
}
