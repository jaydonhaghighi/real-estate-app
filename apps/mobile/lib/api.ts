import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const apiBaseUrl = extra.API_BASE_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/v1';

let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>): void {
  _getToken = fn;
}

async function authHeaders(): Promise<Record<string, string>> {
  if (_getToken) {
    const token = await _getToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

async function buildHttpError(response: Response): Promise<Error> {
  let details: string | undefined;

  try {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const parsed = (await response.json()) as { message?: unknown };
      if (typeof parsed.message === 'string') {
        details = parsed.message;
      } else if (Array.isArray(parsed.message)) {
        details = parsed.message.filter((item) => typeof item === 'string').join(', ');
      }
    } else {
      const textBody = await response.text();
      if (textBody.trim().length > 0) {
        details = textBody.trim();
      }
    }
  } catch (_error) {
    details = undefined;
  }

  const statusText = response.statusText || 'Request failed';
  if (details) {
    return new Error(`${response.status} ${statusText}: ${details}`);
  }
  return new Error(`${response.status} ${statusText}`);
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const response = await fetch(`${apiBaseUrl}${path}`, { headers });
  if (!response.ok) {
    throw await buildHttpError(response);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeaders();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw await buildHttpError(response);
  }
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeaders();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw await buildHttpError(response);
  }

  return response.json() as Promise<T>;
}
