export type ApiErrorDetail = {
  field: string;
  issue: string;
};

export type ApiErrorPayload = {
  code: string;
  message: string;
  details: ApiErrorDetail[] | null;
};

export type ApiResponse<T> = {
  ok: true;
  data: T;
};

export type ApiErrorResponse = {
  ok: false;
  error: ApiErrorPayload;
};

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export type AuthSuccessData = {
  user: User;
  token: string;
};

export class ApiError extends Error {
  code: string;
  details: ApiErrorDetail[] | null;
  status: number;

  constructor(payload: ApiErrorPayload, status: number) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.details = payload.details;
    this.status = status;
  }
}
