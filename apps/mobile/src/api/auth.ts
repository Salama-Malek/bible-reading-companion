import { apiFetch, clearAuthToken, setAuthToken } from './client';
import { AuthSuccessData, User } from './types';

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export async function login(input: LoginInput): Promise<User> {
  const data = await apiFetch<AuthSuccessData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  await setAuthToken(data.token);
  return data.user;
}

export async function register(input: RegisterInput): Promise<User> {
  const data = await apiFetch<AuthSuccessData>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  await setAuthToken(data.token);
  return data.user;
}

export async function me(): Promise<User> {
  const data = await apiFetch<{ user: User }>('/auth/me', {
    method: 'GET',
  });

  return data.user;
}

export async function logout(): Promise<void> {
  await clearAuthToken();
}
