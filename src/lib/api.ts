import type { LoginInput, RegisterInput, Stats, User } from '@/lib/types';

const NETWORK_ERROR_MESSAGE = 'Network error. Please try again.';

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    status: number,
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface ValidationIssue {
  loc: (string | number)[];
  msg: string;
}

function isValidationIssue(value: unknown): value is ValidationIssue {
  if (typeof value !== 'object' || value === null) return false;
  const { loc, msg } = value as Partial<ValidationIssue>;
  return Array.isArray(loc) && loc.length > 0 && typeof msg === 'string';
}

function unexpectedError(status: number): ApiError {
  return new ApiError(status, `Unexpected error (status ${status})`);
}

function toApiError(status: number, body: unknown): ApiError {
  const detail =
    typeof body === 'object' && body !== null
      ? (body as { detail?: unknown }).detail
      : undefined;

  if (typeof detail === 'string' && detail) return new ApiError(status, detail);

  if (
    Array.isArray(detail) &&
    detail.length > 0 &&
    detail.every(isValidationIssue)
  ) {
    const fieldErrors: Record<string, string> = {};
    const parts: string[] = [];
    for (const { loc, msg } of detail) {
      const field = String(loc[loc.length - 1]);
      // Pydantic prefixes custom validator messages; users only need the reason.
      const message = msg.replace(/^Value error, /, '');
      fieldErrors[field] ??= message;
      parts.push(`${field}: ${message}`);
    }
    return new ApiError(status, parts.join('; '), fieldErrors);
  }

  return unexpectedError(status);
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  let body: unknown;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined && { 'Content-Type': 'application/json' }),
      },
    });
    if (response.status === 204) return undefined as T;
    body = await readJson(response);
  } catch {
    // Deliberately drop the original error: it can include the request URL or body.
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) throw toApiError(response.status, body);
  if (body === undefined) throw unexpectedError(response.status);
  return body as T;
}

function post<T>(path: string, payload?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

function get<T>(path: string): Promise<T> {
  // Session and stats must always reflect the server, never a cached copy.
  return request<T>(path, { method: 'GET', cache: 'no-store' });
}

export function register(input: RegisterInput): Promise<User> {
  return post<User>('/api/auth/register', input);
}

export function login(input: LoginInput): Promise<User> {
  return post<User>('/api/auth/login', input);
}

export function logout(): Promise<void> {
  return post<void>('/api/auth/logout');
}

export function getMe(): Promise<User> {
  return get<User>('/api/auth/me');
}

export function getStats(): Promise<Stats> {
  return get<Stats>('/api/dashboard/stats');
}
